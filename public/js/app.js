var app = angular.module('deviceOrientationApp', [
    'ngRoute'
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

app.controller('RoomCtrl', ['$scope', '$routeParams',
    function($scope, $routeParams) {
        $scope.roomId = $routeParams.roomId;

    }
]);

app.controller('RemoteCtrl', ['$scope', '$routeParams',
    function($scope, $routeParams) {
        $scope.roomId = $routeParams.roomId;

    }
]);
