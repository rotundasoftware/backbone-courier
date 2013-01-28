
This document is a record of some of the thought process that went into developing Backbone.Courier and some ideas for best practices in view interaction to help write maintainable code.

### What is the problem, anyway

A well designed Backbone.js application tends to contain a lot of views. Some views are totally self contained, but the majority of views need to interact in some way with other views on the page. There are generally many more views in a Backbone.js application than there are models and collections, and views tend to interact with each other for a wider variety of purposes. As a result managing interaction between views gets messy. The "out of the box" ways to implement view interaction are:

1. Views can call methods of other views. If only it were always this simple! Although this is a straight forward means for views to communicate, and is appropriate in some circumstances, unfortunately when mis-used it can create unnecessary explicit dependencies, since the caller needs an explicit reference to the callee. As your application grows, these explicit dependencies lead to code that is difficult to maintain, re-factor, and test.

2. Views can `trigger()` events, and other views can then listen for those events with `view.listenTo()` or `view.bind()`. While triggering and binding has its place, it also creates explicit dependencies (since the listener needs an explicit reference to the triggerer). Moreover, often times a child view will want to trigger an event of interest to its parent, which will in turn trigger an event of interest to the grandparent, etc. Implementing this behavior with `trigger()` and `listenTo()` leads to cumbersome and difficult to maintain "trigger / listenTo chains", or unnecessary explicit dependencies between child views and their ancestors.

3. Event aggregators can be used to facilitate communication between views. While the event aggregator option is very powerful, there are at least two problems with over-use of this pattern. First, it leads to a criss cross of implicit dependencies, wherein any view is allows to interact, through an aggregator, with any other view. (This cross crossing is facilitated by the fact that aggregators are generally accessed through the global scope, bypassing any structure that encapsulates parts of the view hierarchy.) Secondly, aggregators are their own entities, and it becomes increasingly cumbersome to organize them and track which ones are used by which views as the number of aggregators grows.

### View specific problem, view specific solution

Views are unique in that they only trigger events that are listened to by other views. The view layer is on its "own plane" in this regard. (You are committing a severe design error if your models or collections are in any way aware of your view layer.) It is therefore acceptable to implement a simplified mechanism for inter-view interaction by leveraging another property unique to views: that they have a natural hierarchy, which is mirrored by their elements' positions in the DOM tree.

### What rules should govern the interaction of views in the context of the DOM tree?

* As a matter of necessity, views already have explicit dependencies on their child views, since they themselves generally create and render their children. The easiest and most appropriate way for a view to interact with its children is to call methods on their child views.
* In the interest of encapsulating concerns, views should never have any explicit dependencies on their surroundings or their environment. That is, they should not have any explicit dependencies on their ancestors or their siblings.
* When a view needs to interact with its parent or an ancestor, it can do so without any explicit dependencies by spawning a message that bubbles up the view hierarchy. 
* When passing along messages from their children, parent views should modify them in order to make the message appropriate for the new, larger context and / or hide private concerns from their ancestors.
* Whenever possible, information about a views environment should be passed into the view as a configuration option. However, if the information is dynamic, the view can use round trip messages to obtain additional information
* Views should only call functions on their *immediate* children. Their grandchildren can be interacted with only by calling functions on their children, which in turn call functions on their grandchildren, etc.
