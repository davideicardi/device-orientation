
// just to keep the IDE happy
var io = io || null;
var angular = angular || null;
var THREE = THREE || null;

var app = angular.module('deviceOrientationApp', [
    'ngRoute',
    'monospaced.qrcode'
]);


app.config(['$routeProvider',
    function($routeProvider) {
        $routeProvider.
        when('/', {
            templateUrl: 'partials/_home.html',
            controller: 'HomeCtrl'
        }).
        when('/rooms/:roomId', {
            templateUrl: 'partials/_room.html',
            controller: 'RoomCtrl'
        }).
        when('/remote/:roomId', {
            templateUrl: 'partials/_remote.html',
            controller: 'RemoteCtrl'
        }).
        otherwise({
            redirectTo: '/'
        });
    }
]);

// socket.io wrapper
function socketIOConnection(namespace) {

    this.namespace = namespace || '/';
    this.socket =  io(namespace, {multiplex : false}); // multiplex=false is needed because I close and reopen the connection based on the angular navigation
    
    this.disconnect = function() {
        this.socket.disconnect();
        this.socket = null;
    };
    this.emit = function(eventId, data) {
      this.socket.emit(eventId, data);
    };
    this.on = function(eventId, listener) {
      this.socket.on(eventId, listener);
    };
}

app.value('socketIOService', {
    connect : function(namespace){
        return new socketIOConnection(namespace);
    }
});

app.controller('HomeCtrl', ['$scope', '$routeParams', '$location', '$http',
    function($scope, $routeParams, $location, $http) {

        $scope.reservedRooms = null;
        
        $http.get('/api/rooms').
        success(function(data, status, headers, config) {
            $scope.reservedRooms = data.count;
        });


        $scope.startRoom = function() {
            $http.put('/api/reserveRoom').
            success(function(data, status, headers, config) {
                $location.path('/rooms/' + data.roomId);
            });
        };

    }
]);

app.controller('RoomCtrl', ['$scope', '$routeParams', 'socketIOService',
    function($scope, $routeParams, socketIOService) {
        $scope.roomId = $routeParams.roomId;
        $scope.remote = null;
        $scope.device = { 
            orientation : { gamma: 0, beta: 0, alpha: 0, isFaceDown:false } 
        };

        function loadModel() {
    		var onProgress = function ( xhr ) {
    			if ( xhr.lengthComputable ) {
    				var percentComplete = xhr.loaded / xhr.total * 100;
    				console.log( Math.round(percentComplete, 2) + '% downloaded' );
    			}
    		};
    
    		var onError = function ( xhr ) {
    		};
    
    		var loader = new THREE.OBJMTLLoader();
    		loader.load( '/models/s4.obj', '/models/s4.mtl', function ( object ) {
    
    			$scope.device3DModel = object;
    			$scope.$digest();
    
    		}, onProgress, onError );
        }
        loadModel();

        function onRemoteConnected(data) {
            $scope.remote = data;
            $scope.$digest();
        }
        function onRemoteDisconnected() {
            $scope.remote = null;
            $scope.$digest();
        }
        function onDeviceOrientation(orientation){

            var isFaceDown = Math.abs(orientation.beta) > 90;

            // show debug info            
            $scope.device.orientation = orientation;
            $scope.device.orientation.isFaceDown = isFaceDown;
            $scope.$digest();

            // rotate 3D model applying a correction when the device is face down
            var x = isFaceDown ? 180 + orientation.beta : orientation.beta; // beta
            var y = isFaceDown ? 180 + orientation.alpha : orientation.alpha; // alpha
            var z = isFaceDown ? 180 + orientation.gamma : orientation.gamma; // gamma


            if ($scope.device3DModel) {
                $scope.device3DModel.rotation.x = THREE.Math.degToRad(x);
                $scope.device3DModel.rotation.y = THREE.Math.degToRad(-y); // fix rotation, not sure why...
                $scope.device3DModel.rotation.z = THREE.Math.degToRad(-z); // fix rotation, not sure why...
            }
        }
    
        var socket = socketIOService.connect();
        socket.on('connect', function(){
            socket.emit('initRoom', { roomId: $scope.roomId });
        });

        socket.on('remote-connected', onRemoteConnected);
        socket.on('remote-disconnected', onRemoteDisconnected);
        socket.on('remote-orientation', onDeviceOrientation);

        $scope.$on("$destroy", function() {
            //socketIOService.removeListener('test-orientation', onDeviceOrientation);
            socket.disconnect();
        });
    }
]);

app.controller('RemoteCtrl', ['$scope', '$routeParams', '$window', 'socketIOService',
    function($scope, $routeParams, $window, socketIOService) {
        $scope.roomId = $routeParams.roomId;
        $scope.threshold = 1.0;
        
        var lastOrientation = { gamma: 0, beta: 0, alpha: 0 };
        var initialAlpha = null;
        
        var socket = socketIOService.connect();
        socket.on('connect', function(){
            socket.emit('initRemote', { roomId: $scope.roomId });
        });

        function isChanged(orientation) {
            var threshold = $scope.threshold;

            var c = false;
            if (Math.abs(lastOrientation.gamma - orientation.gamma) > threshold 
            || Math.abs(lastOrientation.beta - orientation.beta) > threshold 
            || Math.abs(lastOrientation.alpha - orientation.alpha) > threshold) {
                c = true;
                lastOrientation = orientation;
            }

            return c;
        }

        function onDeviceOrientation(eventData) {

            if (!initialAlpha) {
                initialAlpha = eventData.alpha;
            }

            var orientation = {
                // gamma is the left-to-right tilt in degrees, where right is positive.
                // Represents the motion of the device around the y axis, 
                //  represented in degrees with values ranging from -90 to 90. This represents a left to right motion of the device.
                gamma: eventData.gamma,

                // beta is the front-to-back tilt in degrees, where front is positive.
                // Represents the motion of the device around the x axis, 
                //  represented in degrees with values ranging from -180 to 180.  This represents a front to back motion of the device.
                beta: eventData.beta,

                // alpha is the compass direction the device is facing in degrees.
                // Represents the motion of the device around the z axis, 
                //  represented in degrees with values ranging from 0 to 360.
                alpha: eventData.alpha
            };

            // fix the alpha so that it correspond to the difference between the current degrees and the initial degrees
            // otherwise it usually represents just the orientation relative to the NORTH
            orientation.alpha = initialAlpha - orientation.alpha;

            if (isChanged(orientation)) {
                socket.emit('remote-orientation', orientation);
            }
        }
        
        if ($window.DeviceOrientationEvent) {
            $window.addEventListener('deviceorientation', onDeviceOrientation, false);
        }
        else {
            $scope.errorMessage = "deviceorientation not supported on your device or browser.  Sorry.";
        }

        $scope.resetAlpha = function(){
            initialAlpha = null;
        };

        $scope.$on("$destroy", function() {
            $window.removeEventListener('deviceorientation', onDeviceOrientation, false);
            socket.disconnect();
        });
    }
]);

app.directive('diThreeJsViewer', [function() {

    function createThreeJsCanvas(parentElement, object) {
        var width = 400;
        var height = 400;
        
        var scene = new THREE.Scene();
        var camera = new THREE.PerspectiveCamera(35, width / height, 2.109, 213.014);
    
        var renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(width, height);
        renderer.setClearColor( 0xffffff, 1);
    
        parentElement.append(renderer.domElement);
    
        camera.position.x = 0;
        camera.position.y = 0;
        camera.position.z = 20;
        //camera.up = new THREE.Vector3(0, 0, 1);
    
        camera.lookAt(new THREE.Vector3(0.000, 0.000, 0.000)); // look at the center 
    
        
        var light = new THREE.PointLight(0x404040, 2);
        light.position.set(20, 20, 0);
        scene.add(light);
        light = new THREE.PointLight(0x404040, 2);
        light.position.set(20, 0, 20);
        scene.add(light);
        light = new THREE.PointLight(0x404040, 2);
        light.position.set(0, 20, 20);
        scene.add(light);

        light = new THREE.AmbientLight(0x404040);
        scene.add(light);


        // add object    
        scene.add(object);
    
        var render = function() {
            requestAnimationFrame(render);
    
            //model.rotation.y += 0.01;
    
            renderer.render(scene, camera);
        };
    
        render();        
    }

    function link(scope, element, attrs) {
    
        scope.$watch("threeJsObject", function(){
            
            if (scope.threeJsObject) {
                createThreeJsCanvas(element, scope.threeJsObject);
            }
            
        }, false);
    }

    return {
        restrict: 'E',
        scope: {
          threeJsObject: '='
        },
        link: link
    };
}]);