

# Backbone.Courier

An easy and intuitive way for your [Backbone.js](http://backbonejs.org/) views to interact, providing an alternative to explicit dependencies, trigger chains, and event aggregators.

## Benefits
* Provides an easy to use message path through which views can communicate up and down your view hierarchy.
* Is designed to promote encapsulation of concerns, and does not rely on the use of application globals.
* Makes it easy to modify messages as appropriate for larger contexts as they bubble up your view hierarchy.
* Takes advantage of existing DOM tree to automatically infer view hierarchy structure (by default).
* Allows child views to call specific functions on their parent views that return values, without explicit dependencies.
* Provides option to enumerate the exact messages are allowed to be emitted by each view.
* Does not use event binding or explicit references so there is no cleanup necessary when views are destroyed.

## What is the problem, anyway

A well designed Backbone.js application tends to contain a lot of views. Some views are totally self contained, but the majority of views need to interact in some way with other views on the page. There are generally many more views in a Backbone.js application than there are models and collections, and views tend to interact with each other for a wider variety of purposes. As a result managing interaction between views gets messy. The "out of the box" ways to implement view interaction are:

1. Views can call methods of other views. If only it were always this simple! Although this is a straight forward means for views to communicate, and is appropriate in some circumstances, unfortunately when mis-used it can create unnecessary explicit dependencies, since the caller needs an explicit reference to the callee. As your application grows, these explicit dependencies lead to code that is difficult to maintain, re-factor, and test.

2. Views can `trigger()` events, and other views can then listen for those events with `view.listenTo()` or `view.bind()`. While triggering and binding has its place, it also creates explicit dependencies (since the listener needs an explicit reference to the triggerer). Moreover, often times a child view will want to trigger an event of interest to its parent, which will in turn trigger an event of interest to the grandparent, etc. Implementing this behavior with `trigger()` and `listenTo()` leads to cumbersome and difficult to maintain "trigger / listenTo chains", or unnecessary explicit dependencies between child views and their ancestors.

3. Event aggregators can be used to facilitate communication between views. While the event aggregator option is very powerful, there are at least two problems with over-use of this pattern. First, it leads to a criss cross of implicit dependencies, wherein any view is allows to interact, through an aggregator, with any other view. (This cross crossing is facilitated by the fact that aggregators are generally accessed through the global scope, bypassing any structure that encapsulates parts of the view hierarchy.) Secondly, aggregators are their own entities, and it becomes increasingly cumbersome to organize them and track which ones are used by which views as the number of aggregators grows.

## View specific problem, view specific solution

Views are unique in that they only trigger events that are listened to by other views. The view layer is on its "own plane" in this regard. (You are committing a severe design error if your models or collections are in any way aware of your view layer.) It is therefore acceptable to implement a simplified mechanism for inter-view interaction by leveraging another property unique to views: that they have a natural hierarchy, which is mirrored by their elements' positions in the DOM tree.

## How it works

Include Backbone.Courier in your project. Now you can mixin Backbone.Courier functionality to your views:

```javascript
var myView = new Backbone.View();
Backbone.Courier.add( myView ); // add courier functionality to myView
```

A view spawns a message that is passed to its parent using `view.spawn( messageName, [data] )`:

```javascript
myView.spawn( "selected", { 
	methodOfSelection: "click"
} );
```

The view's parent can then "handle" the message and / or pass it to the parent's own parent, and so on, up the view hierarchy. By default, the DOM tree is used to automatically infer the view hierarchy structure.

```javascript
MyViewClass = Backbone.View.extend( {
	initialize : function() {
		Backbone.Courier.add( this );
	}

	// "handle" the "selected" message from a child view.
	onMessages : {
		"selected" : "_onChildSelected"
	}

	// pass the "selected" message from a child view up to this view's
	// parent, changing the message's name to "resourceSelected"
	passMessages : {
		"selected" : "resourceSelected"
	},

	_onChildSelected : function( message ) {
		alert( "My child view just spawned the 'selected' message. As dictated " +
			"by my passMessages hash, I'll change it's name to 'resourceSelected', " + 
			"then pass it to my own parent view." );

		// the message argument that is passed to message 
		// handlers has three properties. The name of the message:
		assert( message.name === "selected" );

		// any application defined data that has been supplied:
		assert( message.data.methodOfSelection === "click" );

		// and the child view object that spawned or 
		// passed this message (in this case, myView):
		assert( message.source instanceof Backbone.View );
	}

	// a separate example. messages can also be used to get dynamic
	// values from ancestors, without explicit dependencies.
	_getInfoFromAncestor : function() {
		// messages that end in "!" have return values. They must
		// be handled by an ancestor, or an error will be thrown.
		var info = this.spawn( "giveMeYourInfo!" );
	}
}
```

## Methods and Property reference

### Backbone.Courier.add( view )

Adds courier methods and behavior, as described below, to the view object referenced by the argument.

### view.spawn( messageName, [data] )

The `spawn` method generates a new message and passes it to the view's "parent", i.e. the closest ancestor of this view in the DOM tree. The parent view can then "handle" this message, taking some action upon its receipt, by including an entry for this message in its `onMessages` hash, and it can optionally pass this message to its own parent, using its `passMessages` hash. In this manner the message may bubble up the view hierarchy, as determined (by default) by the DOM tree.

`messageName` is the name of the message being spawned. The name is used in the `onMessages` and `passMessages` hashes of ancestor views to handle or pass the message further up the view hierarchy, respectively.

If `messageName` ends in `!`, the message is considered a "round trip message". Round trip messages are special in that they return values. That is, the view.spawn() method will return the value returned by the first (and only) method that handles the message. Using round trip messages views can obtain dynamic information about their environment that, because it is dynamic, can not be passed in through configuration options. Round trip messages have two other special characteristics:

* Round trip messages *must* be handled. If they are not handled by any ancestor view, an error will be thrown.
* Once a round trip message has been handled, it will not continue to be passed up the view hierarchy.

`data` is an application defined data object that will be available to this view's ancestors when handling or passing this message.

### view.onMessages

The `onMessages` hash is the means by which a parent view can take action on, or "handle", messages received from its children. Messages are written in the format `{ "messageName source" : callback }`. Just like [Backbone's events hash](http://backbonejs.org/#View-delegateEvents), you can either provide the callback as the name of a method on the view, or a direct function body. In either case, the `message` object is provided as the sole argument for the callback function. The `message` object contains three properties:

* `message.name` is the name of the message
* `message.data` is an application defined data object, as provided the in second argument to `view.spawn()`
* `message.source` is the name of the child view that spawned or passed this message to this view.

The `messageName` portion of the `onMessages` hash keys is matched against the name of the messages that are received. An asterix (`*`) can be used as a wild card character in the `messageName` to match zero or more letters, numbers, or underscores. (If multiple entries match the message name, the most specific entry will "win", that is, the entry with the greatest number of non-wildcard characters will be used.

The `source` part of the hash key can be used to match only messages that come from a particular child view. The view reference is resolved using the override-able `view._getChildViewByName()` method. (Matching entries in the `onMessages` hash that have a `source` specified are always considered more specific than those that do not have any `source` specified.)

The default implementation of `view._getChildViewByName()` expects that a hash of child views is kept in `view.subviews`, the keys of the hash being the names of the child views, and the values references to the child view objects themselves. (This implementation works seamlessly with [Backbone.Marionette.Subviews](https://github.com/dgbeck/backbone.marionette.subviews) plugin, since the Backbone.Marionette.Subviews plugin will automatically populate the `subviews` hash appropriately.) You may override `view._getChildViewByName()` if you would like to provide an alternate means of mapping `source` to child view objects. 

```javascript
onMessages : {
	"focused" : function( message ) {
		// handle the "focused" message
		alert( "child view focused" );
		console.log( message.source ); // output child view that spawned or passed this message
	},

	// when the "selected" message from the resourcesCollectionView child view
	// is received, call the _onResourceSelected method on this view
	"selected resourcesCollectionView" : "_onResourceSelected"

	"giveMeInfo!" : function( message ) {
		// handle the "giveMeInfo!" round trip message. 'value'
		// will be returned to the view that spawned the message
		// as the return value of the view.spawn() method
		var value = this._calculateDynamicValue();
		return value;
	}
},

_onResourceSelected : function( message ) {
	// handle the selected message from the resourcesCollectionView child view
}

...
```

### view.passMessages

The `passMessages` hash can be used to pass messages received from a child view further up the view hierarchy, to potentially be handled by a more distant ancestor. Each entry in the hash has the format `{ "messageName source" : newMessage }`.

The `messageName` and `source` parts of the hash key interpreted in exactly the same way as in the `onMessages` hash.

The value of `newMessage` determines the message that is passed to the view's parent. It is often desirable to add additional specificity to a message as it bubbles up to a new, larger context. For example, "selected" might become "resourceSelected" as it moves from a resource view to a parent composite view that contains resources as well as other items. Also, it is sometimes desirable to change some of the application defined data in `message.data`, either to add additional specificity or to remove data that should remain private to lower levels of the view hierarchy.

* If you do not want to change the message at all before passing it up the hierarchy, specify the string `"."` (a single period) as the value for `newMessage`.
* If you would like to change the name of the message, but keep the application defined data the same, specify the new name for the message as the value for `newMessage`.
* If you would like to change the application defined data in the message, specify a direct function body for the value of `newMessage`. The function will be called with two arguments. The first is the message object, with an empty object `{}` as its `message.data` property. The second argument will be the old application defined data. You can also change the name of the message by setting `message.name`.

Example entries in the `passMessages` hash:

```javascript
passMessages : {
	 // pass the "keyup" message on to parent, without any changes
	"keyup" : ".",

	// change the "selected" message from the resourcesCollectionView
	// child view to "resourceSelected", and pass to parent
	"selected resourcesCollectionView" : "resourceSelected", 

	// change the "sortStart" message from the resourcesCollectionView 
	// child view to "resourceSortStart", populate new message.data
	// with { resourceModel : oldData.modelBeingSorted }, and pass to parent
	"sortStart resourcesCollectionView" : function( message, oldData ) {
		message.name = "resourceSortStart";
		message.data.resourceModel = oldData.modelBeingSorted; 
	},

	 // pass all other messages on to parent, without any changes
	"*" : "."
},

...
```

Note that in all cases, when a message is passed, `message.source` is overwritten and set to the view that is passing the message. If you require a reference to the object that originally spawned the message, you will need to keep that in `message.data` as the message bubbles up the hierarchy.

### view.spawnMessages

`view.spawnMessages` is a convenience hash that facilitates spawning messages when DOM events occur within the view's DOM element. The keys of this hash take the same format as the keys in [Backbone's events hash](http://backbonejs.org/#View-delegateEvents). If the value of an entry is a string, a message is spawned with that name. You can also provide a function body as the value of an entry to spawn a message that contains application defined data. The function will be passed two parameters, the first being the message that will be spawned, and the second being the event object as provided by the DOM library.

```javascript
spawnMessages : {
	// spawn the leftLabelClicked message when a click event
	// occurs in the element matching selector div.left.label
	"click div.left.label" : "leftLabelClicked",

	"focus input[type='text']" : function( message, e ) {
		message.name = "inputFocused";
		message.data.initialValue = $( "input[type='text']" ).val();
	}
}
```

Like many of the build in Backbone.js hashes, `spawnMessages` can also be supplied as a function that returns a hash.

### view.allowedMessages

`view.allowedMessages` is an *optional* array that provides a means to enumerate the messages that may be spawned or passed by a particular view. Its elements are message names that are allowed to be spawned or passed by the view. (The asterix (`*`) wildcard is *not* supported in the `allowedMessags` hash.) If a view attempts to spawn or pass a message that is not in the array, and error will be thrown.

```javascript
allowedMessages : [ "keyup, "selected", "sortStart", "giveMeYourInfo!", ... ]
```

If no `allowedMessages` array is provided for a view, there are no limitations on the messages that the view can spawn or pass. `allowedMessages` can also be supplied as a function that returns a hash.

## Internal view methods that may be overridden

The following methods may be overridden to customize Backbone.Courier for your environment. To override one of the methods, attach your own version of the method to your view objects either before or after calling Backbone.Courier.add().

### view._getParentView()

`view._getParentView()` is an internal method that returns a view's "parent view". You may supply your own version of this method on your view objects (which will override the default implementation) if you want to provide a custom means to determine a view's parent. The default implementation determines a view's parent by its position in the DOM tree, scanning the tree for the closest parent that has a Backbone view in $( el ).data( "view" ). This data value is set on each view's element automatically by Backbone.Courier. Note the default implementation depends on jQuery's or Zepto's $.parent() and $.data() methods - the only hard dependency on a DOM library or tree in Backbone.Courier.

### view._getChildViewByName( childViewName )

`view._getChildViewByName( childViewName )` is an internal method that is used to resolve the child view names optionally supplied in the `source` part of the `onMessages` and `passMessages` hash. You may supply your own version of this method on your view objects in order to store child views in a location other than the default `view.subviews[ childViewName ]`.

## Bonus for Backbone.Marionette users

If you are using [Backbone.Marionette](https://github.com/marionettejs/backbone.marionette), you can reuse the aliases defined in the `ui` hash in your `spawnMessages` hash, and even in your `events` hash, so that you do not have to repeat the same selectors between the various hashes. For example:

```javascript
// Backbone.Marionette's ui hash
ui : {
	"valueFld" : "[name='value']"
}

// valueFld is equivalent to [name='value']
spawnMessages : {
	"focus valueFld" : "focus",
	"change valueFld" : "change",
},

// you can even use aliases in events hash. this is a free-bee for consistency
events : {
	"keyup valueFld" : "_valueFld_onKeyUp"
},

_valueFld_onKeyUp : function() {
	// handle keyup event from element matching selector "[name='value']"
}
```

## Dependencies

* Backbone.js (tested with v0.9.9, untested with earlier versions)
* jQuery or Zepto. You can eliminate this dependency by overriding `view._getParentView()` and providing an alternate means to determine view hierarchy that does not rely on the $.parent() and $.data() functions.

## Feedback and bug reports

Please send your feedback, suggestions, and bug reports to [David Beck](https://github.com/dgbeck). This is an early version of the library and I'd love to hear your suggestions on how it can be polished and / or improved for your paricular needs.