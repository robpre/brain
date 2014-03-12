(function( $, factory ) {
    
    if ( typeof module === "object" && typeof module.exports === "object" ) {
        // For CommonJS and CommonJS-like environments where a proper window is present,
        module.exports = function( $ ) {
            //factory;
            var plugin = $.fn.brain = factory( $, window );
            // return a function which will add this plugin to the element/selector passed
            return function( selector, context ) {
                var args = Array.prototype.slice.call( arguments ),
                    options = args.pop(),
                    $el;

                if( typeof options !== 'object' ) {
                    $el = $( selector, context ).brain();
                } else {
                    $el = $.apply( $, args ).brain( options );
                }

                return $el.data('brain');
            };
        };
    } else if( $ ) {
        $.fn.brain = factory( $, window );
    } else {
        throw 'this plugin depends on jQuery';
    }

})( jQuery, function( $, window, undefined ) {

    var uuid = 0,
        defaults = {
            mood: 'placid',
            // pixels a second
            speed: 200,
            css: {
                position: 'absolute',
                top: 0,
                left: 0
            },
            name: 'sheep',
            animFrames: 3,
            animSheep: 1
        };

    function SheepBrain( element, options ) {
        var $this = $(element);

        this.options = $.extend( true, {}, defaults, options );

        this.element = $this;

        this.init();

        return this;
    }

    $.extend( SheepBrain.prototype, {

        'init': function() {

            var self = this;

            this.element
                .css( this.options.css )
                .addClass( this.options.name )
                .addClass( 'brain' )
                .attr('data-type', this.options.animSheep)
                .append( '<div class="sprite">' )
                .attr('id', 'brain' + uuid++);

            this.element.parent().on('tick', this.bind('tick') );

            this.element.on('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend', this.bind('animationEnd'));

            this.element.on('click', function() {
                console.log( self.getPosition() );
                return false;
            });
        },

        'bind': function( fn, context ) {
            var func = typeof fn === 'function' ? fn : this[ fn ];

            context = context || this;
            if( Function.prototype.bind ) {
                return func.bind( context );
            }
            return function() {
                return func.apply( context, arguments );
            };
        },

        'tick': function( evt, delta ) {
            //this.moveTowards( delta, this.destTop, this.destLeft );
            this.animate( delta );

            if( !this.moving ) {

                this.moving = true;

            }
        },

        'animationEnd': (function() {
            // store the last time we checked the timestamp, if the event gets here in the same
            // millisecond as one that has already been handled, then it came from the same movement
            // for example: if we animate top and left, then we will get 2 events for a single movement
            var lastEvt;
            return function( evt ) {
                if( lastEvt !== evt.timeStamp ) {
                    console.log.apply( console, arguments );

                    lastEvt = evt.timeStamp;
                }
            };
        })(),

        /* animation logic */
        lastChangedTime: null,
        animateRunningTotal: null,
        'animate': function( delta ) {
            var cycleTime = this.getSpeed() / 5;

            if( this.animateRunningTotal < ( this.lastChangedTime + cycleTime ) ) {
                this.animateRunningTotal += delta;
            } else {
                this.lastChangedTime = this.animateRunningTotal = Date.now();
                this.cycleAnimation();
            }
        },
        'cycleAnimation': function() {
            var cur = this.element.attr('data-animation');

            this.element.attr('data-animation', cur < this.options.animFrames ? ++cur : 1 );
        },

        'setDirection': function( direction ) {
            this.element.attr('data-direction', direction);
        },
        /* ----------------- */

        'moving': false,
        'targetPosition': (function() {
            var top, left;
            return function( newLeft, newTop ) {
                if( arguments.length ) {
                    if( typeof newLeft === 'object' ) {
                        top = newLeft.top;
                        left = newLeft.left;
                    } else {
                        top = newTop;
                        left = newLeft;
                    }
                }

                return {
                    top: top,
                    left: left
                };
            };
        })(),

        'next': function() {
            var $parent = this.element.parent(),
                newX = this.randomBetween( 0, $parent.width() ),
                newY = this.randomBetween( 0, $parent.height() );
            
            return {
                top: newY,
                left: newX
            };
        },

        'randomBetween': function( min, max ) {
            return min + (Math.random() * ((max-min) + 1));
        },

        'checkOutOfBounds': function() {
            var bounds = this.getBounds(),
                toCheck = ['top', 'left', 'right', 'bottom'];

            for (var i = 0; i < toCheck.length; i++) {
                if( bounds[ toCheck[i] ] < 0 ) {
                    return true;
                }
            }
            return false;
        },

        'getSpeed': function() {
            return this.element.outerWidth() * (this.options.speed / 100);
        },

        /**
         * calculate how far we are gonna travel towards to our target destination
         * tween there using a generated keyframe
         * using speed see how fast we will travel that distance
         *
         * we have 
         *     speed distance
         *     1px/s 30px
         * we need to know
         *     time 30s
         * distance / speed = time
         */
        'move': function( left, top ) {
            var centerOffset = {
                    top: this.element.outerHeight() / 2,
                    left: this.element.outerWidth() / 2
                },
                time = this.calculateDistance( left, top ) / this.getSpeed();

            this.faceLocation( left, top );

            this.element.css('transition-duration', time + 's');
            //this.modifyTransitionDuration( time );

            this.element.css({
                top: Math.round( top - centerOffset.top ),
                left: Math.round( left - centerOffset.left )
            });
        },

        'calculateDistance': function( left, top ) {

            var pos = this.getPosition(),
                leftDeltaSqr = Math.pow( left - pos.left, 2 ),
                topDeltaSqr = Math.pow( top - pos.top, 2 );

            return Math.abs( Math.sqrt( leftDeltaSqr + topDeltaSqr ) );

        },

        /**
         * and also
         * calculate at which angle to face our sheep by looking at our current
         * position and where we will end up
         * -webkit-transform: rotate(xdeg);
         * Math.atan2( dest x delta/ dest y delta ) * (180/Math.PI) + 180
         */
        'faceLocation': function( left, top ) {

            var pos = this.getPosition(),
                xDelta = pos.left - left,
                yDelta = top - pos.top,
                angle = Math.atan2( xDelta, yDelta ) * ( 180 / Math.PI ) + 180,
                direction;

            // 315 to 45: "up",
            // 45 to 135: "right",
            // 135 to 225: "down",
            // 225 to 315: "left"

            if( angle > 315 || angle < 45 ) {
                direction = 'up';
            } else if( angle > 44 && angle < 135 ) {
                direction = 'right';
                angle -= 90;
            } else if( angle > 134 && angle < 225 ) {
                direction = 'down';
                angle -= 180;
            } else if( angle > 224 && angle < 314 ) {
                direction = 'left';
                angle -= 270;
            }

            this.setDirection( direction );
            this.element.find('.sprite').css('transform', 'rotate(' + angle + 'deg)');

            return angle;
        },

        'getBounds': function() {
            var pos = this.element.position(),
                $p = this.element.parent();

            pos.right = $p.width() - pos.left;

            pos.bottom = $p.height() - pos.top;

            return pos;
        },

        // gets the current position of the center point
        'getPosition': function() {

            var position = this.element.position();
                // $parent = this.element.parent(),
                // parentRight = $parent.outerWidth(),
                // parentBottom = $parent.outerHeight();

            return {
                top: position.top + (this.element.outerHeight() / 2),
                left: position.left + (this.element.outerWidth() / 2)
            };

        }

        // DIRTY
        // transitionStyles: null,
        // 'modifyTransitionDuration': function( seconds ) {

        //     if( !this.transitionStyles ) {
        //         this.transitionStyles = $('<style type="text/css"></style>').appendTo( $('body') );
        //     }

        //     this.transitionStyles.html('#' + this.element.attr('id') + ' {transition-duration: ' + seconds + 's;}');

        // }

    });

    return function( options ) {
        var args = Array.prototype.slice.call( arguments, 1 ),
            doPluginAction;

        doPluginAction = function() {

            var brain = $.data( this, 'brain' );

            if( !brain ) {
                $.data( this, 'brain', new SheepBrain( this, options ) );
            } else {
                return brain[options].apply( brain, args );
            }

            return this;
        };

        return this.length > 1 ? this.each( doPluginAction ) : doPluginAction.call( this[0] );
    };

});