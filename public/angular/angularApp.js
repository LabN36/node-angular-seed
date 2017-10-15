angular.module('workApp', ['ngMaterial', 'ui.router'])

    .config(function ($stateProvider, $urlRouterProvider, $locationProvider) {

        $urlRouterProvider.otherwise("/")
        $locationProvider.html5Mode(true);
    })
    .controller('homeCtrl', function ($scope, $http, $location, $window) {
        $scope.dbList = function () {
            $http.get('/api/v1/dblist')
                .success(function (response) {
                    console.log(response);
                })
                .error(function (response) {
                    console.log(response);
                });
        };
            $scope.dbList();
        $scope.ProductServiceMethod = function () {
            console.log(this.productData);
            $http.post('/add', { productData: $scope.productData })
                .success(function (response) {

                })
                .error(function (response) {

                })

        };
    });