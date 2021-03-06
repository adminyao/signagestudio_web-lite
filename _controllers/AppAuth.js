/**
 Manage user authentication and cookie creation and pass results back to app router
 @class AppAuth
 @constructor
 @return {Object} instantiated AppAuth
 **/
define(['jquery', 'backbone'], function ($, Backbone) {

    var AppAuth = BB.Controller.extend({

        /**
         Constructor
         @method initialize
         @return {} Unique clientId.
         **/
        initialize: function () {
            this.authenticated = false;
            this.AUTH_USER_PASS = 0
            this.AUTH_COOKIE = 1
        },

        /**
         Initiate user authentication against the Jalapeno db user credentials
         @method authenticate
         @param {String} i_user
         @param {String} i_pass
         **/
        authenticate: function (i_user, i_pass) {
            var self = this;
            var appRouter = BB.comBroker.getService(BB.SERVICES.LAYOUT_MANAGER);
            appRouter.navigate('authenticating', {trigger: true});
            self._loadCredentials(i_user, i_pass);
        },

        /**
         Load user credentials from cookie if exists, else load from form data
         @method _loadCredentials
         @param {String} i_user
         @param {String} i_pass
         **/
        _loadCredentials: function (i_user, i_pass) {
            var self = this;

            var cookie = $.cookie('signagestudioweblite') == undefined ? undefined : $.cookie('signagestudioweblite').split(' ')[0];
            if (cookie) {
                var credentials = self._breakCookie(cookie);
                self._serverAuthenticate(credentials.user, credentials.pass, this.AUTH_COOKIE);
            } else if (i_user.length > 2 && i_pass.length > 2) {
                self._serverAuthenticate(i_user, i_pass, this.AUTH_USER_PASS);
            } else {
                BB.comBroker.getService(BB.SERVICES['LAYOUT_MANAGER']).navigate('unauthenticated', {trigger: true});
            }
        },

        /**
         Process actual authentication against mediaSERVER and create cookie if checkbox selected in login form
         @method _serverAuthenticate
         @param {String} i_user
         @param {String} i_pass
         @param {Number} i_authMode
         **/
        _serverAuthenticate: function (i_user, i_pass, i_authMode) {
            var self = this;

            BB.Jalapeno.dbConnect(i_user, i_pass, function (i_status) {

                if (i_status.status) {
                    // Auth pass
                    self.authenticated = true;

                    // create cookie
                    if (i_authMode == self.AUTH_USER_PASS && $(Elements.REMEMBER_ME).prop('checked'))
                        self._bakeCookie(i_user, i_pass);

                    if (i_status['warning'].length > 0) {
                        // Pro Account (not a Lite account) so limited access

                        var applyLimitedAccess = function(i_navigationView){
                            i_navigationView.applyLimitedAccess();
                            i_navigationView.forceStationOnlyViewAndDialog();
                        };

                        // if module was not loaded yet wait to be notified from when it does
                        var navigationView = BB.comBroker.listen(BB.SERVICES['NAVIGATION_VIEW']);
                        if (_.isUndefined(navigationView)) {
                            BB.comBroker.listen(BB.EVENTS.SERVICE_REGISTERED, function (e) {
                                if (e.edata.name == BB.SERVICES['NAVIGATION_VIEW']) {
                                    var navigationView = e.edata.service;
                                    applyLimitedAccess(navigationView);
                                }
                            });
                        } else {
                            // just in case we change the order of loadable modules in the future
                            // and navigation module is ready before this module
                            applyLimitedAccess(navigationView);
                        }
                    }
                    BB.comBroker.getService(BB.SERVICES['LAYOUT_MANAGER']).navigate('authenticated', {trigger: true});

                } else {
                    // Auth Fail

                    // if cookie exists, delete it because obviously it didn't do the job
                    if (i_authMode == self.AUTH_COOKIE) {
                        $.removeCookie('signagestudioweblite', { path: '/' });
                        $.removeCookie('signagestudioweblite', { path: '/_studiolite' });
                        $.removeCookie('signagestudioweblite', { path: '/_studiolite-dev' });
                        $.removeCookie('signagestudioweblite', { path: '/_studiolite-dist' });
                    }

                    // let user know authentication failed
                    if (i_status.error == "not a studioLite account") {
                        bootbox.dialog({
                            message: "You must login with a StudioLite account and not a Pro account",
                            title: "keep in mind...",
                            buttons: {
                                info: {
                                    label: "OK",
                                    className: "btn-primary",
                                    callback: function () {
                                    }
                                }
                            }
                        });
                    }
                    BB.comBroker.getService(BB.SERVICES['LAYOUT_MANAGER']).navigate('authenticationFailed', {trigger: true});
                }
            });
        },

        /**
         Create RC4 local encrypted cookie
         @method _bakeCookie
         @param {String} i_user
         @param {String} i_pass
         **/
        _bakeCookie: function (i_user, i_pass) {
            var rc4 = new RC4(BB.globs['RC4KEY']);
            var crumb = i_user + ':SignageStudioLite:' + i_pass + ':' + ' USER'
            crumb = rc4.doEncrypt(crumb);
            $.cookie('signagestudioweblite', crumb, { expires: 300 });
        },

        /**
         Break encrypted cookie RC4 to user credentials
         @method _breakCookie
         @param {String} i_user
         @param {String} i_pass
         @return {Object} credentials
         **/
        _breakCookie: function (i_cookie) {
            var rc4 = new RC4(BB.globs['RC4KEY']);
            var crumb = rc4.doDecrypt(i_cookie).split(':');
            return {
                user: crumb[0],
                pass: crumb[2]
            }
        }
    });

    return AppAuth;
});


