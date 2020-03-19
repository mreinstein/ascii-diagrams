# ascii-diagrams

ascii diagramming done right

![alt text](fig3.png "screenshot" | width=800)


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
* implement move label
* keyboard shortcuts
* make complicated states like line_drawing and labeling nested state machines
* implement move line action
* undo/redo
* explore control plane concept
