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
individual_list_select.setAttribute('id','select-descendants-cell');
var individual_list_item_button = document.createElement('button');
individual_list_item_button.setAttribute('id','select-descendants-cell-button');
individual_list_item_button.textContent = "Select";
individual_list_select.appendChild(individual_list_item_button);
individual_list_item.appendChild(individual_list_select);

var individual_list_select_ancestors = document.createElement('td');
individual_list_select_ancestors.setAttribute('id','select-ancestors-cell');
var individual_list_item_button_ancestors = document.createElement('button');
individual_list_item_button_ancestors.setAttribute('id','select-ancestors-cell-button');
individual_list_item_button_ancestors.textContent = "Select";
individual_list_select_ancestors.appendChild(individual_list_item_button_ancestors);
individual_list_item.appendChild(individual_list_select_ancestors);

function get_individuals_list(GEDCOM_string, list_box){
	// Initial JSON parse of the file
	var GEDCOM_json = GEDCOM2JSON(GEDCOM_string);
	
	// Clean into family structure
	family_data = clean_GEDCOM_JSON(GEDCOM_json);
	//console.log(JSON.stringify(family_data));
	
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
		new_individual.querySelector('#select-descendants-cell-button').setAttribute('onclick',"render_descendants_tree('"+key+"', document.getElementById('file-image'));");
		new_individual.querySelector('#select-ancestors-cell-button').setAttribute('onclick',"render_ancestor_tree('"+key+"', document.getElementById('file-image'));");
		list_box.appendChild(new_individual);
	}
	return family_data;
}


function render_descendants_tree(ancestor_key, SVG_box){
	// Generate descendents tree
	var descendents_tree = generate_descendents_tree(family_data, ancestor_key);

	// Create the actual SVG element
	var SVG_element = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	SVG_element.setAttribute('xmlns', "http://www.w3.org/2000/svg");
	SVG_element.setAttribute('xmlns:xlink', "http://www.w3.org/1999/xlink");
	SVG_element.setAttribute('border', '1px solid black');
	SVG_tree(descendents_tree, SVG_element, true);
	
	// Place on the canvas
	SVG_box.innerHTML = '';
	SVG_box.appendChild(SVG_element);
}


function render_ancestor_tree(descendant_key, SVG_box){
	// Generate descendents tree
	var ancestors_tree = generate_ancestor_tree(family_data, descendant_key);

	// Create the actual SVG element
	var SVG_element = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	SVG_element.setAttribute('xmlns', "http://www.w3.org/2000/svg");
	SVG_element.setAttribute('xmlns:xlink', "http://www.w3.org/1999/xlink");
	SVG_element.setAttribute('border', '1px solid black');
	SVG_tree(ancestors_tree, SVG_element, false);
	
	// Place on the canvas
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
	SVG_element.setAttribute('xmlns', "http://www.w3.org/2000/svg");
	SVG_element.setAttribute('xmlns:xlink', "http://www.w3.org/1999/xlink");
	SVG_element.setAttribute('border', '1px solid black');
	SVG_tree(descendents_tree, SVG_element, true);
	
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
			if ('mother' in curr_fam && curr_fam['mother'] != curr['key']) curr['spouse_key'] = curr_fam['mother'];
			if ('father' in curr_fam && curr_fam['father'] != curr['key']) curr['spouse_key'] = curr_fam['father'];
			if ('spouse_key' in curr && INDI_dict[curr['spouse_key']]) var spouse_JSON = INDI_dict[curr['spouse_key']];
			else var spouse_JSON = {'name':'?', 'birthdate':'?'};
			console.log(curr['name']);
			curr['spouse'] = spouse_JSON['name'];
			curr['spouse_birthdate'] = spouse_JSON['birthdate'];
			
			curr['children'] = [];
			for (var child of curr_fam['children']){
				var new_child = {'key': child, 'generation': curr['generation']+1};
				curr['children'].push(new_child);
				search_stack.push(new_child);
			}
		}
	}
	// Sort children by birthday
	const by_birthday = (a,b) => new Date(a['birthdate']) > new Date(b['birthdate'])? 1 : -1;
	var search_stack = [descendents_tree];
	while (search_stack.length){
		var curr = search_stack.pop();
		if ('children' in curr){
			curr['children'] = curr['children'].sort(by_birthday);
			search_stack.push(...curr['children']);
		}
	}
	
	return descendents_tree;
}


function generate_ancestor_tree(cleaned_GEDCOM_json, descendant_key){
	var INDI_dict = cleaned_GEDCOM_json.INDI_dict;
	var FAM_dict = cleaned_GEDCOM_json.FAM_dict;
	
	// Generate descendents tree
	var ancestors_tree = {'key': descendant_key, 'generation': 1}
	var search_stack = [ancestors_tree]; //INDI_dict.keys().filter(indi => !('child_fam' in INDI_dict[indi]));
	while (search_stack.length){
		var curr = search_stack.pop();
		var curr_JSON = INDI_dict[curr['key']]
		curr['name'] = curr_JSON['name'];
		curr['birthdate'] = curr_JSON['birthdate'];
		if ('child_fam' in curr_JSON){
			curr['children'] = [];
			var curr_fam = FAM_dict[curr_JSON['child_fam']];
			for(var parent of ['mother', 'father'])
				if (parent in curr_fam && INDI_dict[curr_fam[parent]]) {
					var new_child = {'key': curr_fam[parent], 'generation': curr['generation']+1};
					curr['children'].push(new_child);
					search_stack.push(new_child);
			}
		}
	}
	// Sort children by birthday
	const by_birthday = (a,b) => new Date(a['birthdate']) > new Date(b['birthdate'])? 1 : -1;
	var search_stack = [ancestors_tree];
	while (search_stack.length){
		var curr = search_stack.pop();
		if ('children' in curr){
			curr['children'] = curr['children'].sort(by_birthday);
			search_stack.push(...curr['children']);
		}
	}
	
	return ancestors_tree;
}


function descendents_tree_widths(descendents_tree){
	if ('width' in descendents_tree) return descendents_tree['width'];
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

function SVG_tree(descendents_tree, svg_element, down){
	// Fetch max generation and generation list, fix children ordering
	var generation_list = [];
	var stack = [];
	stack.push(descendents_tree);
	while (stack.length > 0){
		var curr = stack.pop();
		if ('children' in curr) stack.push(...curr['children'].slice().reverse());

		// Add the next generation if needed
		if (generation_list.length < curr['generation']) generation_list.push([]);
		else {  // Otherwise update the next and prev cousins
			var genlen = generation_list[curr['generation']-1].length;
			generation_list[curr['generation']-1][genlen-1]['next_cousin'] = curr;
			curr['prev_cousin'] = generation_list[curr['generation']-1][genlen-1];
		}
		// Finally set the offset to position in the generation list, and add self to it
		curr['offset'] = generation_list[curr['generation']-1].length;
		generation_list[curr['generation']-1].push(curr);
	}
	var max_generation = generation_list.length;
	
	// First pass offsets
	first_pass_RT_algorithms(descendents_tree);
	
	// Second pass to prevent negative values
	var min_position = Math.min(0,...left_contour(descendents_tree,0));
	//console.log(min_position);
	
	// Third pass offsets
	third_pass_RT_algorithms(descendents_tree, -min_position);
	//console.log(descendents_tree);
	var max_width = Math.max.apply(null,generation_list.map(row => Math.max.apply(null,row.map(indiv => indiv['offset']))));
	
	// Draw results
	svg_element.setAttribute('width', (4*max_width+6)*scale_px);
	svg_element.setAttribute('height', (2*max_generation+1)*scale_px);
	
	stack.push(descendents_tree);
	while (stack.length > 0){
		var curr = stack.pop();
		if ('children' in curr) stack.push(...curr['children']);
		
		var location = curr['offset'];
		var generation =  curr['generation'];
		if (!down) generation = max_generation + 1 - generation;
		
		add_individual_SVG(svg_element, curr['name'], (2*location+1)*2*scale_px, (2*generation-1)*scale_px);
		/*if ('spouse' in curr){
		 	add_individual_SVG(svg_element, curr['spouse'], (2*(location+1)+1)*2*scale_px, (2*generation-1)*scale_px);
			var spouse_line = document.createElementNS("http://www.w3.org/2000/svg", "line");
			spouse_line.setAttribute('x1', (2*location+2)*2*scale_px);
			spouse_line.setAttribute('y1', (2*generation-1/2)*scale_px);
			spouse_line.setAttribute('x2', (2*location+3)*2*scale_px);
			spouse_line.setAttribute('y2', (2*generation-1/2)*scale_px);
			spouse_line.setAttribute('stroke', 'black');
			svg_element.appendChild(spouse_line);
		}*/
		
		if ('children' in curr && curr['children'].length){
			// Drop line
			var children_line = document.createElementNS("http://www.w3.org/2000/svg", "line");
			children_line.setAttribute('x1', (2*location+3/2)*2*scale_px);
			children_line.setAttribute('y1', (2*generation-0/2 - 3/2*(!down|0))*scale_px);
			children_line.setAttribute('x2', (2*location+3/2)*2*scale_px);
			children_line.setAttribute('y2', (2*generation+1/2 - 3/2*(!down|0))*scale_px);
			children_line.setAttribute('stroke', 'black');
			svg_element.appendChild(children_line);
			
			
			// Get min-max children positions
			var min_child_offset = curr['children'][0]['offset'];
			var max_child_offset = curr['children'][curr['children'].length-1]['offset'];
			//max_child_offset = Math.max(max_child_offset, location+1/2);
			//min_child_offset = Math.min(min_child_offset, location+1/2);
			
			// Sibling line
			var sibling_line = document.createElementNS("http://www.w3.org/2000/svg", "line");
			sibling_line.setAttribute('x1', (2*min_child_offset+3/2)*2*scale_px);
			sibling_line.setAttribute('y1', (2*generation+1/2 - 2*(!down|0))*scale_px);
			sibling_line.setAttribute('x2', (2*max_child_offset+3/2)*2*scale_px);
			sibling_line.setAttribute('y2', (2*generation+1/2 - 2*(!down|0))*scale_px);
			sibling_line.setAttribute('stroke', 'black');
			svg_element.appendChild(sibling_line);
		}
		
		if ( (down && generation != 1) || (!down && generation != max_generation)) {
			var children_line = document.createElementNS("http://www.w3.org/2000/svg", "line");
			children_line.setAttribute('x1', (2*location+3/2)*2*scale_px);
			children_line.setAttribute('y1', (2*generation-1 + 3/2*(!down|0))*scale_px);
			children_line.setAttribute('x2', (2*location+3/2)*2*scale_px);
			children_line.setAttribute('y2', (2*generation-3/2 + 3/2*(!down|0))*scale_px);
			children_line.setAttribute('stroke', 'black');
			svg_element.appendChild(children_line);
		}
	}
}


function first_pass_RT_algorithms(curr){
	// Post-order traversal
	if (curr['children'] && curr['children'].length>0){
		for (var i=0; i<curr['children'].length; i++){
			if (i>0) curr['children'][i]['mod'] = 0;
			curr['children'][i]['offset'] = i;
			first_pass_RT_algorithms(curr['children'][i]);
		}
		var children_mid = (curr['children'][0]['offset'] + curr['children'][curr['children'].length-1]['offset'])/2;
		if ('mod' in curr) curr['mod'] = curr['offset'] - children_mid;
		else curr['offset'] = children_mid;
	}
	
	// Resolve conflicts
	// Get leftmost Sib
	if (!('mod' in curr)) return;
	var sib_dist = 0;
	var sib = curr;
	while('mod' in sib){
		sib_dist++;
		sib = sib['prev_cousin'];
	}
	// Loop over younger sibs
	while (sib != curr){
		// Generate contours
		var curr_left_contour = left_contour(curr, 0);
		var sib_right_contour = right_contour(sib, 0);
		//console.log(curr['name']);
		//console.log(sib['name']);
		//console.log(curr_left_contour);
		//console.log(sib_right_contour);
		
		var max_conflict = -1;
		for (var i=0; i<Math.min(curr_left_contour.length,sib_right_contour.length); i++)
			max_conflict = Math.max(max_conflict, sib_right_contour[i]-curr_left_contour[i]);
		var shift = Math.max(0,max_conflict+1);
		//console.log(shift);
		//console.log(sib_dist);
		curr['offset'] += shift;
		curr['mod'] += shift;
		//console.log(curr['offset']);
		//console.log(sib['offset']);
		// Re-align inner siblings
		if (shift>0 && false){
			var shift_sib = sib['next_cousin'];
			var inner_sib_count = 1;
			var realignment = (curr['offset'] - sib['offset'])/sib_dist;
			while(shift_sib != curr){
				//console.log(realignment);
				//console.log('shiftsib');
				//console.log(shift_sib['name']);
				var alignment = inner_sib_count*realignment + sib['offset'];
				shift_sib['mod'] += alignment - curr['offset'];
				shift_sib['offset'] = alignment;
				
				shift_sib = shift_sib['next_cousin'];
				inner_sib_count++;
			}
		}
		sib_dist--;
		sib = sib['next_cousin'];
	}
}


function left_contour(curr, modSum){
	var result = [];
	if ('children' in curr){
		for (var child of curr['children']){
			var temp = left_contour(child, modSum + (('mod' in curr)?curr['mod']:0));
			for (var i=0; i < temp.length; i++){
				if (result.length <= i) result.push(temp[i]);
				result[i] = Math.min(result[i],temp[i]);
			}
		}
	}
	result.unshift(curr['offset']+modSum);
	return result;
}


function right_contour(curr, modSum){
	var result = [];
	if ('children' in curr){
		for (var child of curr['children']){
			var temp = right_contour(child, modSum + (('mod' in curr)?curr['mod']:0));
			for (var i=0; i < temp.length; i++){
				if (result.length <= i) result.push(temp[i]);
				result[i] = Math.max(result[i],temp[i]);
			}
		}
	}
	result.unshift(curr['offset']+modSum);
	return result;
}


function third_pass_RT_algorithms(curr, modSum){
	curr['offset'] += modSum
	if ('children' in curr)
		for (var child of curr['children'])
			third_pass_RT_algorithms(child, modSum + (('mod' in curr)?curr['mod']:0));
}


var individual_box = document.createElementNS("http://www.w3.org/2000/svg", "rect");
individual_box.setAttribute('rx', 5);
individual_box.setAttribute('ry', 5);
individual_box.setAttribute('width', 3*scale_px);
individual_box.setAttribute('height', scale_px);
individual_box.setAttribute('stroke', 'black');
individual_box.setAttribute('fill', 'none');
var individual_text = document.createElementNS("http://www.w3.org/2000/svg", "text");

function add_individual_SVG(svg_element, name, x, y){
	name = name.split("/");
	var new_individual = individual_box.cloneNode(true);
	new_individual.setAttribute('x', x-scale_px/2);
	new_individual.setAttribute('y', y);
	svg_element.appendChild(new_individual);
	// First name
	var new_individual = individual_text.cloneNode(true);
	new_individual.setAttribute('dominant-baseline', 'middle');
	new_individual.setAttribute('text-anchor', 'middle');
	new_individual.setAttribute('x', x + scale_px);
	new_individual.setAttribute('y', y + scale_px*1/4);
	new_individual.innerHTML = name[0];
	svg_element.appendChild(new_individual);
	// last name
	new_individual = individual_text.cloneNode(true);
	new_individual.setAttribute('dominant-baseline', 'middle');
	new_individual.setAttribute('text-anchor', 'middle');
	new_individual.setAttribute('x', x + scale_px);
	new_individual.setAttribute('y', y + scale_px*3/4);
	new_individual.innerHTML = name[1];
	svg_element.appendChild(new_individual);
}
