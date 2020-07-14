# family_tree_grapher
An Javascript project to render a family tree GEDCOM file in SVG with HTML UI  

See this project in action online: https://jcarr.ca/family-tree-grapher

## Features
* Automatic parsing of most version of the GEDCOM file format
* Generates a sorted table of individuals from the GEDCOM file
* Automatic descendant generations counting
* Graphing of descendants tree in SVG

## About
### GEDCOM File Format
https://en.wikipedia.org/wiki/GEDCOM  
https://www.familysearch.org/developers/docs/guides/gedcom  
GEDCOM (GEnealogical Data COMmunication) is the defacto standard file format for geneolgical data.  
GEDCOM files are plain-text, and structured in a tree format with use of tags to define the objects.  

### Family Tree Structure
https://en.wikipedia.org/wiki/Family_tree  
https://en.wikipedia.org/wiki/Tree_(data_structure)  
https://en.wikipedia.org/wiki/Directed_acyclic_graph  
Technically the full structure of geneological relations is given by a Directed Acyclic Graph (DAG), rather than a tree.  
However, descendants trees and ancestor trees are trees (assuming no incest).  

### Cousins Algorithm
https://en.wikipedia.org/wiki/Cousin  
If someone is not a sibling or ancestor (parent, grandparent, great grandparent, ect) then you can use this algorithm to determine what kind of cousin they are.  
**Note**: if there is no common ancestor, use in-laws to determine the cousin, then add "in-law" at the end.  

*X* is *Y*'s *N*th cousin *M* times removed

1. Let *Z* be the most recent common ancestor to *X* and *Y*.  
2. Let *NX* be the difference in generations between *X* and *Z*  
3. Let *NY* be the difference in generations between *Y* and *Z*  
4. Let *NMin* be the smaller value between *NX* and *NY* (if they are equal *NMin*=*NX*=*NY*)  
5. Let *NMax* be the larger value between *NX* and *NY* (if they are equal *NMax*=*NX*=*NY*)  
6. If *NMin*=*NX*=1 then: *X* is *Y*'s great x(*NY*-*NX*-1) aunt/uncle  
7. If *NMin*=*NY*=1 then: *X* is *Y*'s great x(*NY*-*NX*-1) nephew/niece  
8. Otherwise: *X* is *Y*'s (*NMin*-1)th counsin (*NMax*-*NMin*) times removed  

### Drawing Trees
We can use a few simple facts and assumptions about our descendants tree structure to draw their the graph
- We assume a descendant will have at most 1 significant other with whom they reproduce
- We assume no incest so as to preserve the tree structure of the descendants tree
- Given the above, we have a rooted tree structure with a uniquely defined depth to every node
- Given the above, we may define our drawing space as dicrete rectangular grid in which each cell may contain one person
- Given the above, we know how much vertical height to allocate for the tree's image: it's simply proprortial to the maximum depth of the tree
- We may pair horizontally adjacent cells together so as to give space for significant others
- Given the above, an upper bound for the total horizontal space that needs to be allocated for a given individual the max between their cell plus their significant other's cell's width, and maximum width of a descendant generation from that individual
- This upper bound may be improved upon by "compacting" the graph layout: imagine the individuals existing on horizontal sliders, and then us pushing inwards on all the individuals at the far left and right edges of our image (We would likely apply the constraint that not child descentdant can be pushed far enough until no member of themselves and their siblings appear directly below their parent).


## Glossary
* **Ancestor**: One from whom a person is descended.
* **DAG**: Directed Acyclic Graph. 
* **Descendant**: One to whom a person is an ancestor.
* **GEDCOM**: GEnealogical Data COMmunication. The defacto standard file format for geneolgical data.
* **Generation**: A level of descendants in a family.
* **SVG**: Scalable Vector Graphics. Open standard file format for vector graphics.
