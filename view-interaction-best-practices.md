
Work in progress.

What rules should govern the interaction of views in the context of the hierarchy in the DOM tree?

* As a matter of necessity, views already have explicit dependencies on their child views, since they themselves generally create and render their children. The easiest and most appropriate way for a view to interact with its children is to call methods on their child views.
* In the interest of encapsulating concerns, views should never have any explicit dependencies on their surroundings or their environment. That is, they should not have any explicit dependencies on their ancestors or their siblings.
* When a view needs to interact with its parent or an ancestor, it can do so without any explicit dependencies by spawning a message that bubbles up the view hierarchy. 
* When passing along messages from their children, parent views should modify them in order to make the message appropriate for the new, larger context and / or hide private concerns from their ancestors.
* Whenever possible, information about a views environment should be passed into the view as a configuration option. However, if the information is dynamic, the view can use round trip messages to obtain additional information
* Views should only call functions on their *immediate* children. Their grandchildren can be interacted with only by calling functions on their children, which in turn call functions on their grandchildren, etc.
