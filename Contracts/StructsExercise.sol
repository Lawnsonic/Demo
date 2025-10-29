// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract GarageManager {
    struct Car {
        string make;
        string model;
        string color;
        uint numberOfDoors;
    }

    mapping(address => Car[]) public garage;

    error BadCarIndex(uint index);

    function addCar(
        string calldata make,
        string calldata model,
        string calldata color,
        uint numberOfDoors
    ) public {
        Car memory newCar = Car({
            make: make,
            model: model,
            color: color,
            numberOfDoors: numberOfDoors
        });
        garage[msg.sender].push(newCar);
    }

    function getMyCars() public view returns (Car[] memory) {
        return garage[msg.sender];
    }

    function getUserCars(address user) public view returns (Car[] memory) {
        return garage[user];
    }

    function updateCar(
        uint index,
        string calldata make,
        string calldata model,
        string calldata color,
        uint numberOfDoors
    ) public {
        Car[] storage myGarage = garage[msg.sender];
        if (index >= myGarage.length) {
            revert BadCarIndex(index);
        }
        myGarage[index] = Car({
            make: make,
            model: model,
            color: color,
            numberOfDoors: numberOfDoors
        });
    }

    function resetMyGarage() public {
        delete garage[msg.sender];
    }
}