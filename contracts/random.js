// Using map in Js
const numbers = [ 2, 3, 4, 8]

// multiplication function
function myFunction(num) {
    return num * 10
}

const newArr = numbers.map(myFunction);
console.log(newArr);

// Using filter in Js
const ages = [32, 33, 16, 40];

// console.log(ages.filter(Adults => ages >= 18))
function ageChecker(age) {
    return age >= 18
}

const age = ages.filter(ageChecker)
console.log(age);

// Print only these words which length is greater than 6

const words = [
    "spray",
    "limit",
    "elite",
    "exeberant",
    "destruction",
    "present",
]

function lengthChecker(word){
    return word.length > 6
}
const theWords = words.filter(lengthChecker);
console.log(theWords);

// Using find() In Javascript