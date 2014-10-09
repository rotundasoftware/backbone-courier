# Backbone.Courier

A tiny library that bubble events ("messages") up your [backbone.js](http://backbonejs.org/) view hierarchy while promoting code reuse and maintainability by providing a framework for perfectly encapsulated views.

Wait, what the heck does that mean, "perfectly encapsulated views"?

## Perfectly Encapsulated Views

Communication between views can get messy. However, if you follow some simple rules you can break down complex interfaces into perfectly encapsulated views that are easy to conceptualize, maintain and test. What specifically do perfectly encapsulated views look like?

* Views only call methods on their *immediate* children. Their grandchildren can be interacted with only by calling methods on their children, which in turn call methods on their grandchildren, etc.
* Views never have any explicit dependencies on their surroundings or their environment. That is, they do not have any explicit dependencies on or references to their ancestors or their siblings.
* When a view needs to interact with its parent or an ancestor, it does so (*without* explicit dependencies) by spawning a message that bubbles up the view hierarchy.
* When views pass messages from their children to their ancestors, they modify those messages in order to make them appropriate for the new, larger context and hide private concerns.
* If a view needs information from its ancestors, it requests it using a message that bubbles up the hierarchy and then back down, returning a value (again, *without* explicit dependencies).
* Global variables and / or event aggregators are not used.

Backbone.Courier is a very small library (< 200 lines of code) that can be leveraged to easily follow these rules and create complex interfaces from simple, reusable, decoupled views.

> BONUS: Use Backbone.Courier in conjunction with [Backbone.Subviews](https://github.com/rotundasoftware/backbone.subviews) and
> [Cartero](https://github.com/rotundasoftware/cartero) / [Parcelify](https://github.com/rotundasoftware/parcelify) for a completely modularized backbone.js experience.

## How it works

Include Backbone.Courier in your project. Now you can mixin Backbone.Courier to your views:

```javascript
var myView = new Backbone.View();
Backbone.Courier.add( myView ); // add courier functionality to myView
```

A view spawns a message that is passed to its parent using `view.spawn( messageName, [data] )`:

```javascript
myView.spawn( "selected", this.model );
```

The view's parent can then "handle" the message and / or pass it to the parent's own parent, and so on, up the view hierarchy. By default, the DOM tree is used to infer the view hierarchy.

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

	_onChildSelected : function( data, source, messageName ) {
		alert( "My child view just spawned the 'selected' message." );

		// any application defined data that has been supplied:
		assert( data instanceof Backbone.Model );

		// the child view object that spawned or passed this
		// message (in this case, myView):
		assert( source instanceof Backbone.View );

		// and the name of the message
		assert( messageName === "selected" );

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

### Public API index

* [Backbone.Courier.add( view )](#add) - add courier functionality to view
* [view.spawn( messageName, [data] )](#spawn) - spawn a message to pass up the view hierarchy
* [view.onMessages](#onMessages) - (hash) determines how messages from child views are handled
* [view.passMessages](#passMessages) - (hash) determines how / which messages are passed on to the parent view

---

### <a name="add"></a>Backbone.Courier.add( view )

Adds courier methods and behavior to `view`.

### <a name="spawn"></a>view.spawn( messageName, [data] )

The `spawn` method generates a new message and passes it to the view's "parent", i.e. the closest ancestor view in the DOM tree. The parent view can then "handle" this message, taking some action upon its receipt, by including an entry for this message in its `onMessages` hash, and / or it can pass this message to its own parent, using its `passMessages` hash. In this manner the message may bubble up the view hierarchy, as determined (by default) by the DOM tree.

`messageName` is the name of the message being spawned. The name is used in the `onMessages` and `passMessages` hashes of ancestor views to handle or pass the message further up the view hierarchy, respectively.

`data` is application defined data that will be available to this view's ancestors when handling or passing this message.

> #### Round trip messages
> 
> If `messageName` ends in `!`, the message is considered a "round trip message". Round trip messages are special in that they return values. That is, the `spawn()` method will return the value returned by the first (and only) method that handles the message. Using round trip messages, views can obtain dynamic information about their environment that, because it is dynamic, can not be passed in through configuration options. Round trip messages have two other special characteristics:
>
> * Round trip messages *must* be handled. If they are not handled by any ancestor view, an error will be thrown.
> * Round trip messages will continue to be passed up the hierarchy until they are handled (no entry in the `passMessages` hash is required).

### <a name="onMessages"></a>view.onMessages

The `onMessages` hash is the means by which a parent view can take action on, or "handle", messages received from its children. Entries in the `onMessages` hash have the format:
	
	"messageName source" : callback

<ul>
<li>The <code>messageName</code> portion is matched against the name of the messages that are received.</li>
<li>The <code>source</code> portion can be used to match only messages that come from a particular child view. In order to map the <code>source</code> name to a particular child view, by default Backbone.Courier expects a hash of child views to be stored in <code>view.subviews</code>, the keys of the hash being the names of the child views, and the values references to the child view objects. You can  create this hash yourself, but an easier approach is to use the <a href="Backbone.Subviews">Backbone.Subviews</a> mixin, which will automatically create it for you. (You may also override <code>view._getChildViewNamed()</code> to customize how <code>source</code> mapped to child view objects.)</li>
<li>The "callback" portion determines what is done when a matching message is received. Just like Backbone's events hash, you can either provide the callback as the name of a method on the view, or a direct function body. In either case, the callback is invoked with three arguments:
<ol>
<li><code>data</code> is an application defined data object, as provided the in second argument to <code>view.spawn()</code></li>
<li><code>source</code> is the child view object that spawned or passed this message to this view.</li>
<li><code>messageName</code> is the name of the message</li>
</ol>
</li>
</ul>

Example entries in the `onMessages` hash:

```javascript
onMessages : {
	"focused" : function( data, source ) {
		// handle the "focused" message
		alert( "child view focused" );
		console.log( source ); // the child view that spawned or passed this message
	},

	// when the "selected" message from the resourcesCollectionView child view
	// is received, call the _onResourceSelected method on this view
	"selected resourcesCollectionView" : "_onResourceSelected",

	"giveMeInfo!" : function() {
		// handle the "giveMeInfo!" round trip message. return contents
		// of `value` to the view that spawned the message,
		// as the return value of the view.spawn() method
		var value = this._calculateDynamicValue();
		return value;
	}
},

_onResourceSelected : function( data ) {
	// handle the selected message from the resourcesCollectionView child view
}

...
```

### <a name="passMessages"></a>view.passMessages

The `passMessages` hash is used to pass messages received from a child view further up the view hierarchy, to potentially be handled by a more distant ancestor. Each entry in the hash has the format:

	"messageName source" : "newMessageName"

The `messageName` and `source` parts of the hash key interpreted in exactly the same way as in the `onMessages` hash. 

> Note: An asterix character `*` can be used in both the `passMessages` and `onMessages` hashes as a
> wildcard in the `messageName` to match zero or more letters, numbers, or underscores. If multiple
> entries match the message name, the most specific entry will "win", that is, the entry with the
> greatest number of non-wildcard characters will be used.

The value of `newMessageName` determines the message that is passed to the view's parent. It is often desirable to change a message's name as it bubbles up to a new, larger context. For example, "selected" might become "resourceSelected" as it moves from a resource view to a larger parent view that contains resources as well as other items. If you do not want to change the message at all before passing it up the hierarchy, specify the string `"."` (a single period).

> Note: If you would like to change the application defined data in the message, you need to handle
> the message in the `onMessages` hash and then re-spawn the message with new data.

Example entries in the `passMessages` hash:

```javascript
passMessages : {
	 // pass the "keyup" message on to parent, without any changes
	"keyup" : ".",

	// change the "selected" message from the resourcesCollectionView
	// child view to "resourceSelected", and pass to parent
	"selected resourcesCollectionView" : "resourceSelected", 

	 // pass all other messages on to parent, without any changes
	"*" : "."
},

...
```

## Internal view methods that may be overridden

The following methods may be overridden to customize Backbone.Courier for your environment. To override one of the methods, attach your own version of the method to your view objects either before or after calling Backbone.Courier.add().

### view._getParentView()

`view._getParentView()` is an internal method that returns a view's "parent view". You may supply your own version of this method on your view objects (which will override the default implementation) if you want to provide a custom means to determine a view's parent. The default implementation determines a view's parent by its position in the DOM tree, scanning the tree for the closest parent that has a Backbone view in $( el ).data( "view" ). This data value is set on each view's DOM element automatically by Backbone.Courier.

> Note: The default implementation of '_getParentView' depends on jQuery's or Zepto's `$.parent()` and `$.data()` methods, which is the only dependency on a DOM library or tree in Backbone.Courier.

### view._getChildViewNamed( childViewName )

`view._getChildViewNamed( childViewName )` is an internal method that is used to resolve the child view names optionally supplied in the `source` part of the `onMessages` and `passMessages` hash. You may supply your own version of this method on your view objects in order to store child views in a location other than the default `view.subviews[ childViewName ]`.

## Dependencies

* Backbone.js (tested with v0.9.9 and later, untested with earlier versions)
* jQuery or Zepto. You can eliminate this dependency by overriding `view._getParentView()` and providing an alternate means to determine view hierarchy that does not rely on the `$.parent()` and `$.data()` functions.

## Change log

#### v1.0.0

* BREAKING: Changed signature of `callback` portion of `onMessages` hash from `function( message )` to `function( data, source, messageName )`. Sorry, this is a big breaking change existing projects will need to be changed to work with this new signature. However, it is the right thing to do. If you don't want to change your existing projects, just keep using v0.6.1.
* Removed the ability to supply a function as the value of an entry in the `passMessages` hash.

#### v0.6.1

* Small bug fix that could cause errors of the form `Cannot read property 'data' of undefined`.

#### v0.6.0

* BREAKING: Removed `spawnMessages` hash. Use version v0.5.x if you want this functionality back.
* Now `view.spawn( data )` will call backbone's native `view.trigger( data )` automatically.
* Added UMD wrapper.
