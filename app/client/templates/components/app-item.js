Template.appItem.helpers({

  free: function(price) {

    return price === 0;

  },

  installed: function(app) {

    var user = Meteor.users.findOne(Meteor.userId(), {fields: {installedApps: 1}});
    app = app || this;

    if (!user) return;
    else if (user.installedApps[app._id] !== undefined) return true;

  },

  myRating: function(app) {

    var user = Meteor.users.findOne(Meteor.userId(), {fields: {appRatings: 1}});
    app = app || this;

    if (!user) return;
    else return user.appRatings[this._id];

  },

  installDetails: function(app) {

    var user = Meteor.users.findOne(Meteor.userId(), {fields: {installedApps: 1}});
    app = app || this;

    if (!user) return;
    else return user.installedApps[this._id];

  }

});

Template.appItem.events({

  'click [data-action="uninstall-app-modal"]': function(evt) {

    evt.preventDefault();
    AntiModals.overlay('uninstallApp', {data: this});

  },

  'click [data-action="install-app"]': function(evt) {

    evt.preventDefault();
    Meteor.call('user/installApp', this._id, function(err) {
      if (err) console.log(err);
    });

  },

  'click [data-link="single-app"]': function() {

    FlowRouter.go('/appMarket/app/' + this.app._id);

  }

});


Template.updateChrome.onCreated(function() {

  this.open = new ReactiveVar(false);

});

Template.updateChrome.helpers({

  isOpen: function() {

    return Template.instance().open.get();

  },

  autoupdateApps: function() {

    var user = Meteor.users.findOne(Meteor.userId(), {fields: {autoupdateApps: 1}});

    if (!user) return;
    else return user.autoupdateApps;

  },

  updateDescription: function() {

    // TODO: link to the actual update description
    return "This is a description of the new version and the features it incorporates.";

  },

  latestVersion: function() {

    return Template.parentData(1).latestVersion();

  }

});

Template.updateChrome.events({

  'click [data-action="toggle-open"]': function() {

    var template = Template.instance();
    template.open.set(!template.open.get());

  },

  'click [data-action="update-app"]': function(evt, tp) {

    evt.stopPropagation();
    Meteor.call('user/updateApp', this.app._id, function(err, res) {

      if (err) console.log(err);
      if (res) {
        tp.$('.app-updated-overlay').addClass('visible');
        Meteor.setTimeout(function() {
          tp.open.set(false);
          tp.$('.app-updated-overlay').removeClass('visible');
        }, 3000);
      }

    });

  }

});

Template.appItemFullWidth.helpers({

  appRating: function(stars) {

    stars = stars || 0;
    return _.reduce(_.range(5), function(html, ind) {
      if (stars >= ind + 0.5) html += '<i class="icon-star dark"></i>';
      else html += '<i class="icon-star light"></i>';
      return html;
    }, '');

  },

  free: function(price) {

    return price === 0;

  }

});
