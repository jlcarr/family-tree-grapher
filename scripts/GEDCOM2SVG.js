// Functions for parsing GEDCOM files and rendering them to SVG

var scale_px = 50;
var family_data = {};


var individual_list_item = document.createElement('tr');

var individual_list_name = document.createElement('td');
individual_list_name.setAttribute('id','name-cell');
individual_list_item.appendChild(individual_list_name);

var individual_list_birthdate = document.createElement('td');
individual_list_birthdate.setAttribute('id','birthdate-cell');
individual_list_item.appendChild(individual_list_birthdate);

var individual_list_desc = document.createElement('td');
individual_list_desc.setAttribute('id','descendants-generations-cell');
individual_list_item.appendChild(individual_list_desc);

var individual_list_select = document.createElement('td');
individual_list_select.setAttribute('id','select-cell');
var individual_list_item_button = document.createElement('button');
individual_list_item_button.textContent = "Select";
individual_list_select.appendChild(individual_list_item_button);
individual_list_item.appendChild(individual_list_select);

function get_individuals_list(GEDCOM_string, list_box){
	// Initial JSON parse of the file
	var GEDCOM_json = GEDCOM2JSON(GEDCOM_string);
	
	// Clean into family structure
	family_data = clean_GEDCOM_JSON(GEDCOM_json);
	console.log(JSON.stringify(family_data));
	
	list_box.innerHTML = '';
	var INDI_list = Object.entries(family_data['INDI_dict']);
	INDI_list.sort(
		function(a,b) {
			if (a[1]['descendant_generations'] < b[1]['descendant_generations']) return 1;
			if (a[1]['descendant_generations'] > b[1]['descendant_generations']) return -1;
			if (new Date(a[1]['birthdate']) > new Date(b[1]['birthdate'])) return 1;
			if (new Date(a[1]['descendant_generations']) < new Date(b[1]['birthdate'])) return -1;
			return 0;
		}
	);
	for (var [key, value] of INDI_list){
		var new_individual = individual_list_item.cloneNode(true);
		new_individual.querySelector('#name-cell').textContent = value['name'];
		new_individual.querySelector('#birthdate-cell').textContent = value['birthdate'];
		new_individual.querySelector('#descendants-generations-cell').textContent = value['descendant_generations'];
		list_box.appendChild(new_individual);
	}
	return family_data;
}


function render_family_tree(GEDCOM_string, SVG_box){
	var SVG_element = GEDCOM2SVG(GEDCOM_string);
	SVG_box.innerHTML = '';
	SVG_box.appendChild(SVG_element);
}


function GEDCOM2SVG(GEDCOM_string){
	// Initial JSON parse of the file
	var GEDCOM_json = GEDCOM2JSON(GEDCOM_string);
	
	// Clean into family structure
	var cleaned_GEDCOM_json = clean_GEDCOM_JSON(GEDCOM_json);
	
	// Generate descendents tree
	var descendents_tree = generate_descendents_tree(cleaned_GEDCOM_json);
	
	// Create the actual SVG element
	var SVG_element = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	SVG_element.setAttribute('border', '1px solid black');
	SVG_descendents_tree(descendents_tree, SVG_element);
	
	return SVG_element;
}


function GEDCOM2JSON(GEDCOM_string){
	var return_value = {'children':[]};
	var obj_stack = [return_value];
	var lines = GEDCOM_string.split(/\r\n|\r|\n/);
	for (var line of lines){
		// Parse the line
		var tokens = line.split(' ');
		var depth = parseInt(tokens[0]);
		var tag = tokens[1];
		
		// Get the current object (should always pop at least once)
		while (depth < obj_stack.length) var current_obj = obj_stack.pop();
		
		// Check the current object status
		var new_obj = {'tag': tag, 'children': []};
		if (tokens.length > 2) new_obj['value'] = tokens.slice(2).join(' ');
		//console.log(line);
		current_obj['children'].push(new_obj)
		
		// Replace the current object on the stack, with new on top
		obj_stack.push(current_obj);
		obj_stack.push(new_obj);
	}
	return return_value;
}


function clean_GEDCOM_JSON(GEDCOM_json){
	// Clean into family structure
	var INDI_dict = {};
	var FAM_dict = {};
	for (var entity of GEDCOM_json['children']){
		// Individual
		if ('value' in entity && entity['value'] == 'INDI'){
			var new_INDI = {'spouse_fam':[]};
			for (var attribute of entity['children']){
				if (attribute['tag'] == 'NAME' && 'value' in attribute) new_INDI['name'] = attribute['value'];
				if (attribute['tag'] == 'SEX' && 'value' in attribute) new_INDI['sex'] = attribute['value'];
				if (attribute['tag'] == 'FAMS' && 'value' in attribute) new_INDI['spouse_fam'].push(attribute['value']);
				if (attribute['tag'] == 'FAMC' && 'value' in attribute) new_INDI['child_fam'] = attribute['value'];
				if (attribute['tag'] == 'BIRT'){
					for (var attribute_sub of attribute['children']){
						if (attribute_sub['tag'] == 'DATE' && 'value' in attribute_sub) new_INDI['birthdate'] = attribute_sub['value'];
					}
				}
			}
			INDI_dict[entity['tag']] = new_INDI;
		}
		// Family
		if ('value' in entity && entity['value'] == 'FAM'){
			var new_FAM = {'children':[]};
			for (var attribute of entity['children']){
				if (attribute['tag'] == 'HUSB' && 'value' in attribute) new_FAM['father'] = attribute['value'];
				if (attribute['tag'] == 'WIFE' && 'value' in attribute) new_FAM['mother'] = attribute['value'];
				if (attribute['tag'] == 'CHIL' && 'value' in attribute) new_FAM['children'].push(attribute['value']);
				if (attribute['tag'] == 'MARR'){
					for (var attribute_sub of attribute['children']){
						if (attribute_sub['tag'] == 'DATE' && 'value' in attribute_sub) new_FAM['marriage date'] = attribute_sub['value'];
					}
				}
			}
			FAM_dict[entity['tag']] = new_FAM;
		}
	}
	cleaned_GEDCOM_json = {'INDI_dict': INDI_dict, 'FAM_dict':FAM_dict};
	count_descendant_generations(cleaned_GEDCOM_json);
	return cleaned_GEDCOM_json;
}


function count_descendant_generations(cleaned_GEDCOM_json, search_set = null, target_key = null){
	if (!target_key){
		search_set = new Set(Object.keys(cleaned_GEDCOM_json['INDI_dict']));
		while (search_set.size > 0){
			target_key = search_set.values().next().value;
			count_descendant_generations(cleaned_GEDCOM_json, search_set, target_key);
		}
	}
	else {
		search_set.delete(target_key);
		var target = cleaned_GEDCOM_json['INDI_dict'][target_key];
		target['descendant_generations'] = 0;
		if (target['spouse_fam'].length){
			for (var family of target['spouse_fam']){
				for (var child of cleaned_GEDCOM_json['FAM_dict'][family]['children']){
					if (search_set.has(child)){
						count_descendant_generations(cleaned_GEDCOM_json, search_set, child);
					}
					child = cleaned_GEDCOM_json['INDI_dict'][child];
					target['descendant_generations'] = Math.max(target['descendant_generations'], child['descendant_generations']+1);
				}
			}
		}
	}
}


function generate_descendents_tree(cleaned_GEDCOM_json, ancestor_key){
	var INDI_dict = cleaned_GEDCOM_json.INDI_dict;
	var FAM_dict = cleaned_GEDCOM_json.FAM_dict;
	
	// Generate descendents tree
	var descendents_tree = {'key': ancestor_key, 'generation': 1}
	var search_stack = [descendents_tree]; //INDI_dict.keys().filter(indi => !('child_fam' in INDI_dict[indi]));
	while (search_stack.length){
		var curr = search_stack.pop();
		var curr_JSON = INDI_dict[curr['key']]
		curr['name'] = curr_JSON['name'];
		curr['birthdate'] = curr_JSON['birthdate'];
		if (curr_JSON['spouse_fam'].length){
			var curr_fam = FAM_dict[curr_JSON['spouse_fam'][0]];
			curr['spouse_key'] = curr_fam['mother'] != curr['key'] ? curr_fam['mother'] : curr_fam['father'];
			var spouse_JSON = INDI_dict[curr['spouse_key']];
			curr['spouse'] = spouse_JSON['name']
			curr['spouse_birthdate'] = spouse_JSON['birthdate']
			curr['children'] = [];
			for (var child of curr_fam['children']){
				var new_child = {'key': child, 'generation': curr['generation']+1};
				curr['children'].push(new_child);
				search_stack.push(new_child);
			}
		}
	}
	return descendents_tree;
}


function descendents_tree_widths(descendents_tree){
	var self_width = ('spouse' in descendents_tree) ? 2 : 1;
	if (!('children' in descendents_tree)){
		descendents_tree['width'] = self_width;
		return self_width;
	}
	const reducer = (total_width, child) => total_width + descendents_tree_widths(child);
	var children_width = descendents_tree['children'].reduce(reducer, 0);
	var width = Math.max(self_width, children_width);
	descendents_tree['width'] = width;
	return width;
}


var max_generation = 1;
function SVG_descendents_tree(descendents_tree, svg_element, offset = 1){
	var generation = descendents_tree['generation'];
	if (generation == 1) descendents_tree_widths(descendents_tree);
	
	var width = descendents_tree['width'];
	if (generation == 1) svg_element.setAttribute('width', (4*width+6)*scale_px);
	
	if (generation == 1) max_generation = 0;
	if (generation > max_generation){
		max_generation = generation;
		svg_element.setAttribute('height', (2*max_generation+3)*scale_px);
	}
	
	var location = Math.floor(width/2) + offset - ('spouse' in descendents_tree ? 1 : 0);
	
	add_individual_SVG(svg_element, descendents_tree['name'], location*4*scale_px, generation*2*scale_px);
	
	if ('spouse' in descendents_tree){
		add_individual_SVG(svg_element, descendents_tree['spouse'], (location+1)*4*scale_px, generation*2*scale_px);
		var spouse_line = document.createElementNS("http://www.w3.org/2000/svg", "line");
		spouse_line.setAttribute('x1', (4*location+2)*scale_px);
		spouse_line.setAttribute('y1', (generation*2+1/2)*scale_px);
		spouse_line.setAttribute('x2', (location+1)*4*scale_px);
		spouse_line.setAttribute('y2', (generation*2+1/2)*scale_px);
		spouse_line.setAttribute('stroke', 'black');
		svg_element.appendChild(spouse_line);
	}
	
	
	if ('children' in descendents_tree && descendents_tree['children'].length){
		var children_line = document.createElementNS("http://www.w3.org/2000/svg", "line");
		children_line.setAttribute('x1', (4*location+3)*scale_px);
		children_line.setAttribute('y1', (generation*2+1/2)*scale_px);
		children_line.setAttribute('x2', (4*location+3)*scale_px);
		children_line.setAttribute('y2', (generation*2+3/2)*scale_px);
		children_line.setAttribute('stroke', 'black');
		svg_element.appendChild(children_line);
	
		var max_location = location+0.5;
		var min_location = location+0.5;
	
		const by_birthday = (a,b) => new Date(a['birthdate']) > new Date(b['birthdate'])? 1 : -1;
		for (var child of descendents_tree['children'].sort(by_birthday)){
			child_location = SVG_descendents_tree(child, svg_element, offset = offset);
			offset += child['width'];
			max_location = Math.max(max_location, child_location);
			min_location = Math.min(min_location, child_location);
		}
		
		var children_line = document.createElementNS("http://www.w3.org/2000/svg", "line");
		children_line.setAttribute('x1', (4*min_location+1)*scale_px);
		children_line.setAttribute('y1', (generation*2+3/2)*scale_px);
		children_line.setAttribute('x2', (4*max_location+1)*scale_px);
		children_line.setAttribute('y2', (generation*2+3/2)*scale_px);
		children_line.setAttribute('stroke', 'black');
		svg_element.appendChild(children_line);
	}
	
	if (generation != 1) {
		var children_line = document.createElementNS("http://www.w3.org/2000/svg", "line");
		children_line.setAttribute('x1', (4*location+1)*scale_px);
		children_line.setAttribute('y1', (generation*2-1/2)*scale_px);
		children_line.setAttribute('x2', (4*location+1)*scale_px);
		children_line.setAttribute('y2', (generation*2)*scale_px);
		children_line.setAttribute('stroke', 'black');
		svg_element.appendChild(children_line);
	}

	return location;
}


var individual_box = document.createElementNS("http://www.w3.org/2000/svg", "rect");
individual_box.setAttribute('rx', 5);
individual_box.setAttribute('ry', 5);
individual_box.setAttribute('width', 2*scale_px);
individual_box.setAttribute('height', scale_px);
individual_box.setAttribute('stroke', 'black');
individual_box.setAttribute('fill', 'none');
var individual_text = document.createElementNS("http://www.w3.org/2000/svg", "text");

function add_individual_SVG(svg_element, name, x, y){
	var new_individual = individual_box.cloneNode(true);
	new_individual.setAttribute('x', x);
	new_individual.setAttribute('y', y);
	svg_element.appendChild(new_individual);
	var new_individual = individual_text.cloneNode(true);
	new_individual.setAttribute('dominant-baseline', 'middle');
	new_individual.setAttribute('text-anchor', 'middle');
	new_individual.setAttribute('x', x + scale_px);
	new_individual.setAttribute('y', y + scale_px/2);
	new_individual.innerHTML = name;
	svg_element.appendChild(new_individual);
}
