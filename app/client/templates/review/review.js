// Create and declare app object outside template callbacks, then it will
// persist across route visits.

var appProto = function() {
      return {
        name: '',
        category: '',
        author: Meteor.userId()
      };
    },
    app = new ReactiveDict();

Template.Review.onCreated(function() {

  var tmp = this;

  tmp.file = new ReactiveVar();
  tmp.categories = new ReactiveVar();
  tmp.seedString = new ReactiveVar(Random.id());
  tmp.imageUrl = new ReactiveVar(false);
  tmp.screenshotsVis = new ReactiveVar(3);
  tmp.suggestNewGenre = new ReactiveVar(false);
  tmp.editingFields = new ReactiveVar({});
  tmp.editedFields = new ReactiveVar({});
  tmp.newVersion = new ReactiveVar(false);

  var resetScreenshotsVis = function() {
    tmp.screenshotsVis.set(Math.min(Math.ceil(($(window).width() - 300) / 600), 3));
  };
  resetScreenshotsVis();

  tmp.app = app;
  var newApp = appProto();
  Schemas.AppsBase.clean(newApp);
  tmp.app.set(newApp);

  tmp.setCategories = function(categories) {

    var allCategories = tmp.categories.get();

    _.each(categories, function(cat) {
      var thisCat = _.findWhere(allCategories, {name: cat});
      if (thisCat) thisCat.selected = true;
      else allCategories.push({
        name: cat,
        showSummary: true,
        new: true,
        selected: true
      });
    });

    tmp.categories.set(allCategories);
    // tmp.app.set('categories', allCategories);
    tmp.categories.dep.changed();

  };

  tmp.toggleCategory = function(category) {

    var categories = tmp.categories.get();
    if (typeof category === 'string') category = _.findWhere(categories, {name: category});
    if (!category) return;

    if (category.selected) {
      delete category.selected;
      tmp.app.set('categories', _.without(tmp.app.get('categories'), category.name));
      if (category.new) tmp.categories.set(_.reject(categories, function(thisCat) { return thisCat.name === category.name; }));
    } else {
      category.selected = true;
      tmp.app.set('categories', tmp.app.get('categories').concat(category.name));
    }
    tmp.categories.dep.changed();

  };

  tmp.clearApp = function() {

    var newApp = appProto(),
        oldApp = tmp.app.all();
    Schemas.AppsBase.clean(newApp);
    _.each(oldApp, function(val, key) {
      tmp.app.set(key, newApp[key]);
    });
    Meteor.call('user/delete-saved-app', function(err) {
      if (err) console.log(err);
    });

  };

  // Autorun to regenerate identicon when required
  tmp.autorun(function() {
    tmp.app.set('image', App.blockies.create({
      seed: tmp.seedString.get(),
      size: 5,
      scale: 50
    }).toDataURL());
  });

  // Need to wait for categories sub to be ready before recording
  // existing categories.
  tmp.autorun(function(c) {

    if (FlowRouter.subsReady()) {

      // Now we can store the genre list
      var categories = Categories.find().fetch();
      tmp.categories.set(categories);

      // Save the original app for comparison
      tmp.originalApp = Apps.findOne(FlowRouter.getParam('appId'));

      // And load either the saved version or the actual app,
      if (Meteor.user() && Meteor.user().savedApp && Meteor.user().savedApp[FlowRouter.getParam('appId')]) {
        tmp.app.set(Meteor.user().savedApp[FlowRouter.getParam('appId')]);
      } else {
        var newVersion = Apps.findOne(FlowRouter.current().params.appId),
            lastVersionNumber = newVersion.latestVersion();
        newVersion.replacesApp = newVersion._id;
        newVersion.versions = [];
        Schemas.AppsBase.clean(newVersion);
        newVersion.lastVersionNumber = lastVersionNumber;
        tmp.app.set(newVersion);
      }
      tmp.setCategories(tmp.app.get('categories'));

      c.stop();
    }

  });

  var resetScreenshotsVis = function() {
    tmp.screenshotsVis.set(Math.min(Math.ceil(($(window).width() - 300) / 600), 3));
  };

  $(window).on('resize.upload', resetScreenshotsVis);

  // TODO: delete this, debug method
  window.showApp = function() {
    console.log(tmp.app.all());
  };

});

Template.Review.onDestroyed(function() {
  $(window).off('resize.upload');
});

Template.Review.helpers({

  app: function() {

    return Template.instance().app.all();

  },

  parentApp: function() {

    return Apps.findOne(FlowRouter.current().params.appId);

  },

  isFlagged: function() {

    var app = Apps.findOne(FlowRouter.current().params.appId);
    return app && !_.isEmpty(app.flags);

  },

  fieldEdit: function(field) {

    return Template.instance().editingFields.get()[field];

  },

  newVersion: function() {

    return Template.instance().newVersion.get();

  },

  appNotes: function() {

    return Template.instance().get('appNotes').get();

  },

  edited: function(field) {

    return Template.instance().editedFields.get()[field];

  },

  originalApp: function() {

    return Template.instance().get('originalApp');

  },

  status: function() {

    var originalApp = Apps.findOne(FlowRouter.getParam('appId'));
    return [

      {
        color: 'green',
        icon: 'icon-approved_light',
        text: 'Approved'
      },
      {
        color: '',
        icon: '',
        text: 'Pending'
      },
      {
        color: 'purple',
        icon: 'icon-revisions',
        text: 'Revision Requested'
      },
      {
        color: 'black',
        icon: 'icon-rejected_light',
        text: 'Rejected'
      },


    ][originalApp && originalApp.approved];

  }

});

Template.Review.events({

  'click [data-action="submit-note"]': function(evt, tmp) {
    Meteor.call('apps/addNote', FlowRouter.current().params.appId, tmp.$('[data-field="note-entry"]').val(), function(err) {
      tmp.$('[data-field="note-entry"]').val('');
      if (err) throw new Meteor.Error(err.message);
    });
  },

  'click div[data-alt-field]': function(evt, tmp) {

    var fields = tmp.editingFields.get(),
        thisField = $(evt.currentTarget).data('alt-field');
    fields[thisField] = true;
    tmp.editingFields.set(fields);
    Tracker.afterFlush(function() {
      tmp.$('[data-field="' + thisField + '"]').focus();
    });

  },

  'change input[type="text"][data-field], change textarea[data-field], change input[type="number"][data-field]': function(evt, tmp) {

    var $el = $(evt.currentTarget);
    tmp.app.set($el.data('field'), $el.val());

  },

  'blur [data-field], keyup [data-field]': function(evt, tmp) {

    if (evt.keyCode && evt.keyCode !== 13) return false;
    var $el = $(evt.currentTarget);
    var editingFields = tmp.editingFields.get(),
        editedFields = tmp.editedFields.get(),
        field = $el.data('field');
    delete editingFields[field];
    editedFields[field] = ($el.val() !== tmp.originalApp[field]);
    tmp.editingFields.set(editingFields);
    tmp.editedFields.set(editedFields);

  },

  'click [data-action="update-version"]': function(evt, tmp) {

    tmp.newVersion.set(true);
    if (evt.currentTarget.nodeName === 'INPUT') {
      Tracker.afterFlush(function() {
        $('[data-version-field="number" ]').focus();
      });
    }

  },

  'change [data-action="update-version"]': function(evt, tmp) {

    var versions = tmp.app.get('versions'),
        newVersion = {
          dateTime: new Date(),
          number: tmp.$('[data-version-field="number"]').val(),
          changes: tmp.$('[data-version-field="changes"]').val()
        };
    tmp.app.set('versions', [newVersion]);

  },

  'click [data-action="toggle-private"]': function(evt, tmp) {

    tmp.app.set('public', !tmp.app.get('public'));

  },

  'click [data-action="make-free"]': function(evt, tmp) {

    tmp.app.set('price', 0);

  },

  'click [data-action="submit-app"]': function(evt, tmp) {

    if (tmp.app.get('versions').length > 0) {
      Meteor.call('user/submit-update', tmp.app.all(), function(err, res) {
        if (err) console.log(err);
        else if (res) FlowRouter.go('appsByMe');
      });
    } else {
      console.log('No new version specified');
    }

  },

  'click [data-action="save-app"]': function(evt, tmp) {

    Meteor.call('user/save-app', tmp.app.all(), function(err) {
      if (err) console.log(err);
    });

  },

  'click [data-action="discard-edits"]': function(evt, tmp) {

    Meteor.call('user/delete-saved-app', tmp.app.get('replacesApp'), function(err, res) {
      if (err) {
        console.log(err);
      }
      else {
        tmp.clearApp();
        var newVersion = Apps.findOne(FlowRouter.current().params.appId);
        newVersion.replacesApp = newVersion._id;
        newVersion.versions = [];
        Schemas.AppsBase.clean(newVersion);
        tmp.app.set(newVersion);
        tmp.setCategories(tmp.app.get('categories'));
      }
    });

  },

  'click [data-action="delete-app"]': function(evt, tmp) {

    // TODO: Add modal confirm
    Meteor.call('user/delete-app', tmp.app.get('replacesApp'), function(err, res) {
      if (err) console.log(err);
      else {
        tmp.clearApp();
      }
    });

  },

  'click [data-action="scroll-top"]': function() {

    window.scrollTo(0, 0);

  },

  'click [data-action="approve"]': function() {
    Meteor.call('apps/approve', FlowRouter.current().params.appId, function(err) {
      if (err) throw new Meteor.Error(err.message);
    });
  },
  'click [data-action="request-revision"]': function() {
    Meteor.call('apps/request-revision', FlowRouter.current().params.appId, function(err) {
      if (err) throw new Meteor.Error(err.message);
    });
  },
  'click [data-action="flag"]': function() {
    Meteor.call('apps/flag', FlowRouter.current().params.appId, function(err) {
      if (err) throw new Meteor.Error(err.message);
    });
  },
  'click [data-action="reject"]': function() {
    Meteor.call('apps/reject', FlowRouter.current().params.appId, function(err) {
      if (err) throw new Meteor.Error(err.message);
    });
  },

});

Template.descriptionEditor.onCreated(function() {

  var tmp = this;

  tmp.original = new ReactiveVar();
  tmp.current = new ReactiveVar();
  tmp.viewOriginal = new ReactiveVar(false);

  tmp.autorun(function(c) {
    if (FlowRouter.subsReady()) {
      Tracker.afterFlush(function() {
        tmp.original.set(tmp.data.initial);
        tmp.current.set(tmp.data.initial);
        c.stop();
      });
    }
  });

});

Template.descriptionEditor.helpers({

  current: function() {
    return Template.instance().get('current').get();
  },
  original: function() {
    return Template.instance().get('original').get();
  },
  viewOriginal: function() {
    return Template.instance().get('viewOriginal').get();
  }

});

Template.descriptionEditor.events({

  'click [data-action="edit-markdown"]': function(evt, tmp) {
    tmp.viewOriginal.set(false);
  },

  'click [data-action="view-original"]': function(evt, tmp) {
    tmp.viewOriginal.set(true);
  },

  'change [data-field="description"]': function(evt, tmp) {
    var app = tmp.get('app');
    app.set('description', $(evt.currentTarget).val());
  }

});
