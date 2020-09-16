# family_tree_grapher
An Javascript project to render a family tree GEDCOM file in SVG with HTML UI  

See this project in action online: https://jcarr.ca/family-tree-grapher

## Features
- Automatic parsing of most version of the GEDCOM file format
- Generates a sorted table of individuals from the GEDCOM file
- Automatic descendant generations counting
- Graphing of descendants tree in SVG

## About
### GEDCOM File Format
- https://en.wikipedia.org/wiki/GEDCOM  
- https://www.familysearch.org/developers/docs/guides/gedcom  
- GEDCOM (GEnealogical Data COMmunication) is the defacto standard file format for geneolgical data.  
- GEDCOM files are plain-text, and structured in a tree format with use of tags to define the objects.  

### Family Tree Structure
- https://en.wikipedia.org/wiki/Family_tree  
- https://en.wikipedia.org/wiki/Tree_(data_structure)  
- https://en.wikipedia.org/wiki/Directed_acyclic_graph  
- Technically the full structure of geneological relations is given by a Directed Acyclic Graph (DAG), rather than a tree.  
- However, descendants trees and ancestor trees are trees (assuming no incest).  

### Cousins Algorithm
- https://en.wikipedia.org/wiki/Cousin  
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

## Drawing Trees
- http://www.dgp.toronto.edu/~mjmcguff/research/genealogyVis/genealogyVis.pdf
### First Draft
We can use a few simple facts and assumptions about our descendants tree structure to draw their the graph
- We assume a descendant will have at most 1 significant other with whom they reproduce
- We assume no incest so as to preserve the tree structure of the descendants tree
- Given the above, we have a rooted tree structure with a uniquely defined depth to every node
- Given the above, we may define our drawing space as dicrete rectangular grid in which each cell may contain one person
- Given the above, we know how much vertical height to allocate for the tree's image: it's simply proprortial to the maximum depth of the tree
- We may pair horizontally adjacent cells together so as to give space for significant others
- Given the above, an upper bound for the total horizontal space that needs to be allocated for a given individual the max between their cell plus their significant other's cell's width, and maximum width of a descendant generation from that individual
- This upper bound may be improved upon by "compacting" the graph layout: imagine the individuals existing on horizontal sliders, and then us pushing inwards on all the individuals at the far left and right edges of our image (We would likely apply the constraint that not child descentdant can be pushed far enough until no member of themselves and their siblings appear directly below their parent).

### Second Draft: Condensing The Graph
- Draw the graph with an in-place order DFS approach
- Try to place elements as far left as possible, but oldest descendant must also be able to be placed
- Also ensure the youngest child will be directly below the parents or older (help constrain future cousins)
- This results in an optimally compact graph in terms of total width, but siblings are not always optimally compact
- Next slide in children (checking youngest descendants slack) to help compact, but still isn't optimal when parent isn't optimally placed

### A Proper Algorithm: The Reingold-Tilford Algorithm
- https://rachel53461.wordpress.com/2014/04/20/algorithm-for-drawing-trees/
- https://www.drdobbs.com/positioning-nodes-for-general-trees/184402320?pgno=4
- https://en.wikipedia.org/wiki/Tree_traversal
- This algorithm uses post-order tree traversal along with the concept of tree contours to draw trees that are aesthetically pleasing and close to optimally dense
- This algorithm optimizes the following:
   - There is a minimum spacing between nodes of the same generation
   - Parents must be centered above their children
   - There should be as little whitespace as possible
- It also has these nice properties
   - Subtrees should be draw the same way regardless of where they occur
   - Mirrored trees structures produce mirrored drawings

### As A Quadratic Programming Algorithm
- https://en.wikipedia.org/wiki/Quadratic_programming
- https://en.wikipedia.org/wiki/Penalty_method
- https://www.math.uh.edu/~rohop/fall_06/Chapter4.pdf
- Optimal layout of the tree can be formulated as QP problem
- Inequality constraints are to keep sequential cousins/siblings in order
- Inequality constraints also to keep youngest and oldest children to the right and left of parents respectively
- Objective function has is linear in distances between oldest and youngest siblings respectively
- Objective function is quadratic in position between parents and oldest and youngest children (optimal in center)
- Objective function coefficients are chosing to prioritize linear widths over quadratic cenrtering
- How to solve this quadratic programming problem?
   - SLSQP
   - COBYLA
   - SQP
   - Penalty method: inequality <i>c</i><sub>i</sub>(<i>x</i>) &leq; 0 into <i>L</i> + step(<i>x</i>) <i>x</i><sup>2</sup>

## Glossary
- **Ancestor**: One from whom a person is descended.
- **DAG**: Directed Acyclic Graph. 
- **Descendant**: One to whom a person is an ancestor.
- **GEDCOM**: GEnealogical Data COMmunication. The defacto standard file format for geneolgical data.
- **Generation**: A level of descendants in a family.
- **SVG**: Scalable Vector Graphics. Open standard file format for vector graphics.


## Todo
- Format the name text with resizing to fit
- Add download capability
- Add list sorting features
- Add kinship classifier
