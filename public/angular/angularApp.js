angular.module('workApp',['ngMaterial','ui.router'])

.config(function($stateProvider,$urlRouterProvider,$locationProvider){

$urlRouterProvider.otherwise("/")
$locationProvider.html5Mode(true);
})
.controller('homeCtrl',function($scope,$http,$location,$window){
       $scope.ProductServiceMethod = function() {
        console.log(this.productData);
       $http.post('/add',{productData:$scope.productData})
       .success(function(response){
           
       })
       .error(function(response){
           
       })
    
};
});