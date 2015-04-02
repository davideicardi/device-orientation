
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
app.value('socketIOService', io());

app.controller('HomeCtrl', ['$scope', '$routeParams', '$location', '$http',
    function($scope, $routeParams, $location, $http) {

        $scope.startRoom = function() {
            $http.get('/api/reserveRoom').
            success(function(data, status, headers, config) {
                $location.path('/rooms/' + data.roomId);
            });
        }

    }
]);

app.controller('RoomCtrl', ['$scope', '$routeParams', 'socketIOService',
    function($scope, $routeParams, socketIOService) {
        $scope.roomId = $routeParams.roomId;
        $scope.device = { name: 'unknown', orientation : { gamma: 0, beta: 0, alpha: 0 } };

        var modelOrientation = null;
        
        function onDeviceOrientation(orientation){

            // show debug info            
            $scope.device.orientation = orientation;
            $scope.$digest();

            /*
            var isFaceDown = Math.abs(orientation.beta);
            var y = isFaceDown ? -orientation.gamma : orientation.gamma;
            var x = orientation.beta;
            var z = 0;//orientation.alpha;

            window.TEMP_MODEL.rotation.x = THREE.Math.degToRad(x + 180);
            window.TEMP_MODEL.rotation.y = THREE.Math.degToRad(y);
            window.TEMP_MODEL.rotation.z = THREE.Math.degToRad(z + 180);
            */

            
            if (!modelOrientation){
                modelOrientation = new OrientationToObject(window.TEMP_MODEL);
            }
            modelOrientation.update(orientation);
        }
    
        socketIOService.on('test-orientation', onDeviceOrientation);

        $scope.$on("$destroy", function() {
            socketIOService.removeListener('test-orientation', onDeviceOrientation);
        });
    }
]);

app.controller('RemoteCtrl', ['$scope', '$routeParams', '$window', 'socketIOService',
    function($scope, $routeParams, $window, socketIOService) {
        $scope.roomId = $routeParams.roomId;
        $scope.threshold = 0.5;
        
        var lastOrientation = { gamma: 0, beta: 0, alpha: 0 };
        var initialAlpha;
        
        function isChanged(orientation) {
            var threshold = $scope.threshold;

            var c = false;
            if (Math.abs(lastOrientation.gamma - orientation.gamma) > threshold || Math.abs(lastOrientation.beta - orientation.beta) > threshold || Math.abs(lastOrientation.alpha - orientation.alpha) > threshold) {
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
                alpha: initialAlpha - eventData.alpha
            };

            if (isChanged(orientation)) {
                socketIOService.emit('test-orientation', orientation);
            }
        }
        
        if ($window.DeviceOrientationEvent) {
            $window.addEventListener('deviceorientation', onDeviceOrientation, false);
        }
        else {
            $scope.errorMessage = "deviceorientation not supported on your device or browser.  Sorry.";
        }

        $scope.$on("$destroy", function() {
            $window.removeEventListener('deviceorientation', onDeviceOrientation, false);
        });
    }
]);
