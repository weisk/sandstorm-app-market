Meteor.startup(function() {
  
  var renderer = new marked.Renderer();
  
  // overwrite image renderer to return an empty string
  renderer.image = function (href, title, text) {
    return '';
  };
  
  // "gfm" accepts Github-flavor markdown
  // "sanitize" escapes html within the markdown
  marked.setOptions({
    renderer: renderer,
    gfm: true,
    sanitize: true
  });
  
  Api.getIndex(function(err, data) {
    if (err) return AntiModals.overlay('errorModal', {data: {err: 'There was an error loading app data from the server'}});  
    
    var categories = [],
        genres;
    _.forEach(data.apps, function(app) {
      app._id = app.appId;

      var pref = moderatorPreferenceOrder.indexOf(app.appId);
      // Make new apps show up in the middle.
      if (pref < 0) {
        pref = 0;
      } else {
        pref -= Math.floor(moderatorPreferenceOrder.length / 2);
      }
      app.moderatorPreference = pref;

      if (!app.author.name && app.appId ===
          "7qvcjh7gk0rzdx1s3c8gufd288sesf6vvdt297756xcv4q8xxvhh") {
        // Jack forgot to set his name in Keybase.
        app.author.name = "Jack Singleton";
      }

      if (app.shortDescription === "notetaking") {
        // Fixup Brainstorm shortDescription.
        app.shortDescription = "Note-taking";
      }

      Apps.insert(app);
      categories = _.uniq(categories.concat(app.categories));
    });
    AppMarket.appInit.set(true);
    _.each(categories, function(cat) {
      Categories.insert({
        name: cat,
        populated: true,
        showSummary: true,
        approved: 0
      });
    });
    AppMarket.populatedGenres.set(AppMarket.extraGenres.concat(Genres.getPopulated()));
  });

  Tracker.autorun(function () {
    FlowRouter.getRouteName();
    if (window.ga) { window.ga('send', 'pageview', location.pathname); }
  });

});

// TEMPORARY HACK: Until  we have actual popularity data, we define a curated "featured app"
// ordering with the hope of directing demo users to try certain apps first. Don't read too much
// into this ordering -- it's fairly random beyond the first few.
moderatorPreferenceOrder = [
  "h37dm17aa89yrd8zuqpdn36p6zntumtv08fjpu8a8zrte7q1cn60", // Etherpad
  "m86q05rdvj14yvn78ghaxynqz7u2svw6rnttptxx49g1785cdv1h", // Wekan
  "8aspz4sfjnp8u89000mh2v1xrdyx97ytn8hq71mdzv4p4d8n0n3h", // Davros
  "vfnwptfn02ty21w715snyyczw0nqxkv3jvawcah10c6z7hj1hnu0", // Rocket.Chat
  "nn7axgy3y8kvd0m1mtk3cwca34t916p5d7m4j1j2e874nuz3t8y0", // FileDrop
  "a0n6hwm32zjsrzes8gnjg734dh6jwt7x83xdgytspe761pe2asw0", // EtherCalc
  "nfqhx83vvzm80edpgkpax8mhqp176qj2vwg67rgq5e3kjc5r4cyh", // draw.io
  "1gda5n8p8zsc0r9pcana2yjgtvsq169068k4ve8mk68z4x9fvzuh", // EtherDraw
  "ztxnreej8a0pqn97ccfhuckswjkrmsaavn85n5sgzk30tv2k4y9h", // SandForms
  "7qvcjh7gk0rzdx1s3c8gufd288sesf6vvdt297756xcv4q8xxvhh", // HackerSlides
  "n4n49dkfyskmhcmg5h0mfzk4kjvce2jcs8ravr7y7uw9xs2pzghh", // TextEditor
  "du1nkmp0edheyjq07rm8s1tzr4qs4ut7k24vc2ps0vzm30zp77y0", // Idea Otter
  "d9ygf47xrtnw12j92cyt6cu8ut75esx01u4q3kcrn8415w9qzzgh", // Gogs
  "6va4cjamc21j0znf5h5rrgnv0rpyvh1vaxurkrgknefvj0x63ash", // GitWeb
  "fq057t4ek3yt96xsfje6c1wv61pkjkqm9hs1539x4jqxjwzdp7fh", // Dillinger
  "4mfserfc04wtcevvgn0jw27hvwfntmt8j468y3ma55kj8d5tj9kh", // Hummingbird
  "xuajusd5d4a9v4js71ru0cwj9wn984q1x8kny10htsp8f5dcfep0", // Piwik
  "vxe8awcxvtj6yu0vgjpm1tsaeu7x8v8tfp71tyvnm6ykkephu9q0", // Paperwork
  "r75g5cp60zsc3u80zt278kek9v84k786c0tf7mm30hwhvu2njrg0", // Go
  "zt4j87mc54jkgaehgfqyq2a0qeytm15pcskazvxfkh10yqg4rsrh", // NodeBB
  "4dgxs5m0gnjmjpg88mswqsy9fj08t3z6c8kwv4y9tkgxvp9eas9h", // Laverna
  "sptx6z162fp1w8rwe92vc8tzm76v0mk0wwc9yafze2vpghjs48j0", // Brainstorm
  "qkgkaxfqhgsff8zgx2f4nf1a8xvmpte6wa19egmfkk06mzt7e8dh", // Let's Chat
  "fj5ehfkjgvnpfjgyptnacnrq6v3282af5kxr6uy4pszngadvgzf0", // BrowserQuest
  "wfg1r0qra2ewyvns05r0rddqttt57qxurz3nz5z95rjnm63et7e0", // Groove Basin
  "5vuv7v0w7gu20z72m78n83rx9qqtqpmtk32f39823wh967z226qh", // ShareLaTeX
  "s244puc94dz2nph0n38qgkxkg3yrckxc93vxuz31grtey4rke3j0", // Framadate
  "0qhha1v9ne1p42s5jw7r6qq6rt5tcx80zpg1f5ptsg7ryr4hws1h", // Roundcube
  "2m8rty615fcj11z2u5674s8a74yv48v695k05x61anmt61gp1z80", // Apache Wave
  "zx9d3pt0fjh4uqrprjftgpqfwgzp6y2ena6098ug3ctv37uv6kfh", // GitLab
  "mkqyz71cc96e8gmq2h4dhnfm56k90t2055muv33h2ptw1q6h8n4h", // Ghost
  "rprqf3t2h3vd3swfkhwk076qrennh9msreyjv70g7sgw5hkdxjph", // IPython Notebook
  "y88wavuqwz0p3tjcqtdt8egauq9hpnzr1s9efq1d63rwtj1w0ech", // MediaWiki
  "5h13ka55xn93gpenjc29f5kxqpjf5gk4drgx949q4dx7gk968smh", // Telescope
  "8x12h6p0x0nrzk73hfq6zh2jxtgyzzcty7qsatkg7jfg2mzw5n90", // HLedger
  "70awyqss6jq2gkz7dwzsnvumzr07256pzdt3hda9acfuxwh6uh7h", // MediaGoblin
  "ap9cdcf994hy3wd5u0cuw50s7frugwz7qv0vzsduqqydrdknetf0", // Game of Y
  "0dp7n6ehj8r5ttfc0fj0au6gxkuy1nhw2kx70wussfa1mqj8tf80", // Simple Todos
  "7kszn2vf4a4rhg5vcfmky6pcvc8tdwegwxv0fnjr286g778av3h0", // Meteor Blocks
  "z6rj6js4h8p8rjz2myp3dwmv3mcfv40qyfdn0d7714qxzvzvq3w0", // Lychee
  "7m2fcfn7qdyexs3jmn6vrdngcryeuc8y4fa6jpyj4fgwh5tq27ph", // Acronymy
  "yx8a62h5ytxdcnhvxuq9t5r2fngr1yfvs5sw776e7vv2zrx68u4h", // Duoludo
  "aax9j672p6z8n7nyupzvj2nmumeqd4upa0f7mgu8gprwmy53x04h", // WordPress
  "w544a46cjwtje73rfearjvszwa3nhjtxjanu5s83qkdutx6k0nz0", // Scrumblr
  "nqmcqs9spcdpmqyuxemf0tsgwn8awfvswc58wgk375g4u25xv6yh", // Hacker CMS
  "zj20q6pwy456cmq0k57n1mtqqtky664dfqnhsmf3t36khch5geph", // Tiny Tiny RSS
];
