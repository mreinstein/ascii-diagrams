# ascii-diagrams

ascii diagramming done right

![alt text](fig3.png "screenshot")


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
* highlight item to move under the mouse cursor (label, box)
* highlight item to delete under mouse cursor (label, line, box)
* make the active command stand out more
* bug: when hints show, the outline of the active command grows and looks odd
* clicking outside the export window should close it
* show backdrop behind export modal
* implement delete text
* combine `move box` and `move label` into a single command
* on window resize, increase grid columns/rows when it doesn't at least cover the window viewport
* implement edit label
* implement move line
* undo/redo
