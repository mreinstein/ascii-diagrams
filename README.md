# ascii-diagrams

ascii diagramming done right

![alt text](fig1.png "screenshot")


Despite there being a number of grid rendering modules, I couldn't find satisfying all criteria:

* **is not blurry on retina screens**
* no anti-aliasing
* **60fps rendering performance**
* produces nice looking ascii that can be embedded in code, markdown, etc.


so here we are.


## installation

```
npm install
npm start
```


### TODO
* adjust canvas size on window resize
* explore control plane
* make complicated states like line_drawing and labeling nested state machines
* import
* resize box
* move line
* undo/redo
