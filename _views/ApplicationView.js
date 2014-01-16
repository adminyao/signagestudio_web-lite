define(['jquery', 'backbone'], function ($, Backbone) {

    var ApplicationView = Backbone.View.extend({

        initialize: function () {
        },

        alertMe: function () {
            alert('Ive been alerted' + Backbone);
        },

        render: function() {
            this.$el.css({display: 'block'})
        }

    })


    return ApplicationView;

});
