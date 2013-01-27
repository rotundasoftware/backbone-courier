
# Backbone.Courier

Easily bubble events ("messages") up your view hierarchy in your [Backbone.js](http://backbonejs.org/) applications for an intuitive approach to inter-view communication, free of explicit dependencies.

## Benefits
* Creates an easy to use message path through which views can communicate up (and down) your view hierarchy.
* Is designed to promote encapsulation of concerns, and does not rely on the use of application globals.
* Makes it easy to modify messages as appropriate for larger contexts as they bubble up your view hierarchy.
* Takes advantage of existing DOM tree to automatically infer view hierarchy structure (by default).
* Allows child views to call specific functions on their parent views that return values, without explicit dependencies.
* Provides option to enumerate the exact messages that are allowed to be emitted by each view.
* Does not use event binding or explicit references so there is no cleanup necessary when views are removed.
* Fits together with the [Backbone.Subviews](https://github.com/rotundasoftware/backbone.subviews) view mixin so parents can easily respond to messages from particular children.

## How it works

Include Backbone.Courier in your project. Now you can mixin Backbone.Courier functionality to your views:

```javascript
var myView = new Backbone.View();
Backbone.Courier.add( myView ); // add courier functionality to myView
```

A view spawns a message that is passed to its parent using `View.spawn( messageName, [data] )`:

```javascript
myView.spawn( "selected", { 
	methodOfSelection: "click"  // application defined data
} );
```

The view's parent can then "handle" the message and / or pass it to the parent's own parent, and so on, up the view hierarchy. By default, the DOM tree is used to automatically infer the view hierarchy structure.

```javascript
MyViewClass = Backbone.View.extend( {
	initialize : function() {
		Backbone.Courier.add( this );
	}

	// "handle" the "selected" message from any child view.
	onMessages : {
		"selected" : "_onChildSelected"
	}

	// pass the "selected" message from any child view up to this view's
	// parent, changing the message's name to "resourceSelected"
	passMessages : {
		"selected" : "resourceSelected"
	},

	_onChildSelected : function( message ) {
		alert( "My child view just spawned the 'selected' message." );

		// the message argument that is passed to message 
		// handlers has three properties. The name of the message:
		assert( message.name === "selected" );

		// any application defined data that has been supplied:
		assert( message.data.methodOfSelection === "click" );

		// and the child view object that spawned or 
		// passed this message (in this case, myView):
		assert( message.source instanceof Backbone.View );

		alert( "After I'm done here, because of the entry in my passMessages " +
			"hash, I'll change this message's name to 'resourceSelected', " + 
			"then pass it to my own parent view." );
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

### Public API overview

* [Backbone.Courier.add( view )](#add) - add courier functionality to view
* [View.spawn( messageName, [data] )](#spawn) - spawn a message to pass up the view hierarchy
* [View.onMessages](#onMessages) - (hash) determines how received messages are handled by a view
* [View.passMessages](#passMessages) - (hash) determine how / which messages are passed to the parent view
* [View.spawnMessages](#spawnMessages) - (hash) spawn messages automatically from DOM events

### <a name="add"></a>Backbone.Courier.add( view )

Adds courier methods and behavior, as described below, to the view object referenced by the argument.

### <a name="spawn"></a>View.spawn( messageName, [data] )

The `spawn` method generates a new message and passes it to the view's "parent", i.e. the closest ancestor of this view in the DOM tree. The parent view can then "handle" this message, taking some action upon its receipt, by including an entry for this message in its `onMessages` hash, and it can optionally pass this message to its own parent, using its `passMessages` hash. In this manner the message may bubble up the view hierarchy, as determined (by default) by the DOM tree.

`messageName` is the name of the message being spawned. The name is used in the `onMessages` and `passMessages` hashes of ancestor views to handle or pass the message further up the view hierarchy, respectively.

`data` is an application defined data object that will be available to this view's ancestors when handling or passing this message.

> #### Round trip messages
> 
> If `messageName` ends in `!`, the message is considered a "round trip message". Round trip messages are special in that they return values. That is, the `spawn()` method will return the value returned by the first (and only) method that handles the message. Using round trip messages, views can obtain dynamic information about their environment that, because it is dynamic, can not be passed in through configuration options. Round trip messages have two other special characteristics:
>
> * Round trip messages *must* be handled. If they are not handled by any ancestor view, an error will be thrown.
> * Once a round trip message has been handled, it will not continue to be passed up the view hierarchy.

### <a name="onMessages"></a>View.onMessages

The `onMessages` hash is the means by which a parent view can take action on, or "handle", messages received from its children. Entries in the `onMessages` hash are written in the format:
	
	"messageName source" : callback

<ul>
<li>The <code>messageName</code> portion is matched against the name of the messages that are received.</li>
<li>The <code>source</code> portion can be used to match only messages that come from a particular child view. In order to map the <code>source</code> name to a particular child view, by default Backbone.Courier expects a hash of child views to be stored in <code>view.subviews</code>, the keys of the hash being the names of the child views, and the values references to the child view objects. You can  create this hash yourself, but an easier approach is to use the <a href="Backbone.Subviews">Backbone.Subviews</a> mixin, which will automatically create it for you. Alternatively, you may override <code>View._getChildViewByName()</code> to customize how <code>source</code> mapped to child view objects.</li>
<li>The "callback" portion determines what is done when a matching message is received. Just like Backbone's events hash, you can either provide the callback as the name of a method on the view, or a direct function body. In either case, the message object is provided as the sole argument for the callback function. The message object always contains exactly three properties:
<ol>
<li><code>message.name</code> is the name of the message</li>
<li><code>message.data</code> is an application defined data object, as provided the in second argument to <code>View.spawn()</code></li>
<li><code>message.source</code> is the child view object that spawned or passed this message to this view.</li></li>
</ol>
</li>
</ul>

Example entries in the `onMessages` hash:

```javascript
onMessages : {
	"focused" : function( message ) {
		// handle the "focused" message
		alert( "child view focused" );
		console.log( message.source ); // output child view that spawned or passed this message
	},

	// when the "selected" message from the resourcesCollectionView child view
	// is received, call the _onResourceSelected method on this view
	"selected resourcesCollectionView" : "_onResourceSelected",

	"giveMeInfo!" : function( message ) {
		// handle the "giveMeInfo!" round trip message. return contents
		// of `value` to the view that spawned the message,
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

### <a name="passMessages"></a>View.passMessages

The `passMessages` is used to pass messages received from a child view further up the view hierarchy, to potentially be handled by a more distant ancestor. Each entry in the hash has the format:

	"messageName source" : newMessage

The `messageName` and `source` parts of the hash key interpreted in exactly the same way as in the `onMessages` hash. 

> Note: An asterix character `*` can be used in both the `passMessages` and `onMessages` hashes as a
> wildcard in the `messageName` to match zero or more letters, numbers, or underscores. If multiple
> entries match the message name, the most specific entry will "win", that is, the entry with the
> greatest number of non-wildcard characters will be used.

The value of `newMessage` determines the message that is passed to the view's parent. It is often desirable to change a message slightly as it bubbles up to a new, larger context. For example, "selected" might become "resourceSelected" as it moves from a resource view to a larger parent view that contains resources as well as other items. Also, it is sometimes desirable to change some of the application defined data in `message.data`, either to add additional data or to remove data that should remain private to lower levels of the view hierarchy.
* If you do not want to change the message at all before passing it up the hierarchy, specify the string `"."` (a single period) as the value for `newMessage`.
* If you would like to change the name of the message, but keep the application defined data the same, specify the new name for the message as the value for `newMessage`.
* If you would like to change the application defined data in the message, specify a direct function body for the value of `newMessage`. The function will be called with two arguments. The first is the message object, with an empty object `{}` as its `message.data` property. The second argument will be the old application defined data, that is, the data passed up by the child view. You can also change the name of the message by setting `message.name`.

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

### <a name="spawnMessages"></a>View.spawnMessages

`view.spawnMessages` is a convenience hash that facilitates spawning messages when DOM events occur within the view's DOM element. The keys of this hash take the same format as the keys in [Backbone's events hash](http://backbonejs.org/#View-delegateEvents). If the value of an entry is a string, a message is spawned with that name. You can also provide a function body as the value of an entry to spawn a message that contains application defined data. The function will be passed two parameters, the first being the message that will be spawned, and the second being the event object as provided by the DOM library.

```javascript
spawnMessages : {
	// spawn the "leftLabelClicked" message when a click event
	// occurs in the element matching selector div.left.label
	"click div.left.label" : "leftLabelClicked",

	"focus input[type='text']" : function( message, e ) {
		message.name = "inputFocused";
		message.data.initialValue = $( "input[type='text']" ).val();
	}
}
```

Like many of the build in Backbone.js hashes, `spawnMessages` can also be supplied as a function that returns a hash.

## Internal view methods that may be overridden

The following methods may be overridden to customize Backbone.Courier for your environment. To override one of the methods, attach your own version of the method to your view objects either before or after calling Backbone.Courier.add().

### View._getParentView()

`View._getParentView()` is an internal method that returns a view's "parent view". You may supply your own version of this method on your view objects (which will override the default implementation) if you want to provide a custom means to determine a view's parent. The default implementation determines a view's parent by its position in the DOM tree, scanning the tree for the closest parent that has a Backbone view in $( el ).data( "view" ). This data value is set on each view's DOM element automatically by Backbone.Courier.

> Note: The default implementation of '_getParentView' depends on jQuery's or Zepto's `$.parent()` and `$.data()` methods, which is the only dependency on a DOM library or tree in Backbone.Courier.

### View._getChildViewByName( childViewName )

`View._getChildViewByName( childViewName )` is an internal method that is used to resolve the child view names optionally supplied in the `source` part of the `onMessages` and `passMessages` hash. You may supply your own version of this method on your view objects in order to store child views in a location other than the default `view.subviews[ childViewName ]`.

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
	"change valueFld" : "change"
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
* jQuery or Zepto. You can eliminate this dependency by overriding `View._getParentView()` and providing an alternate means to determine view hierarchy that does not rely on the `$.parent()` and `$.data()` functions.

## Feedback and bug reports

Please share your feedback, suggestions, and bug reports by opening issues. We'd love to hear your suggestions on how this plugin can be polished and / or improved for your paricular needs.
