"use strict";
class Question { // question encapsulation

    constructor(...parts) {
        this._parts = parts;
    }

    static get answers() { // get all blank answers
        return this._answers;
    }

    get parts() { // get all plain text form parts
        return this._parts;
    }

    #createHint(part) { // create hint part
        let ppart = part;
        if (part.indexOf("%") > 0) { // if contains placeholder text
            ppart =
                part.substring(0, part.indexOf("%")) +
                part.substring(
                    part.lastIndexOf("%") + 1
                ); // will consider all text inside the outer most '%' wrap as placeholder
        }
        return document.createTextNode(part.substring(1, ppart.length - 1));
    }

    #createBlank(part) { // create blank part
        let input = document.createElement("input"); // blank input

        input.type = "text"; // styling
        input.style.color = "black";
        input.style.backgroundColor = "#efdec8";
        input.style.margin = "2px";
        input.style.textAlign = "center";

        let placeholder; // placeholder text
        if (part.indexOf("%") > 0) {
            input.placeholder = part.substring(
                part.indexOf("%") + 1,
                part.lastIndexOf("%")
            ); // will consider all text inside the outer most '%' wrap as placeholder
            placeholder = input.placeholder;
        }

        input.id = "answer-input-" + Question._answers.size; // locating id

        let answer = // set answer
            part.indexOf("%") > 0
                ? part.substring(1, part.indexOf("%")) +
                  part.substring(part.lastIndexOf("%") + 1, part.length - 1)
                : part.substring(1, part.length - 1); // remove placeholder
        
        input.style.width =
            placeholder && placeholder.length > answer.length
                ? placeholder.length * 16 + "px"
                : answer.length * 16 + "px"; // styling
        
        Question._answers.set(input.id, answer); // load answer to global answer array with its uid

        return input;
    }

    toHTMLDivElement() { // get a full question div

        let divElement = document.createElement("div"); // root div
        let pElement = document.createElement("p"); // spacing paragraph

        let bElement = document.createElement("b"); // line symbol
        bElement.innerHTML = "&nbsp;·&nbsp;";
        pElement.appendChild(bElement); // append

        try { // main question generator

            let allBlank = true; // check if ready for being answered
            let allHint = true;
            let ignoreFillings = questionDifficulty != 1;

            for (let index = 0; index < this.parts.length; index++) { // iterate through parts
                let part = this.parts[index];

                if (part.startsWith("$")) { // blank part
                    let n; // determine whether this part will be a hint or a blank
                    switch (questionDifficulty) { // check the difficulty
                        case 0:
                            n = 1; // always hint
                            break;
                        case 1:
                            n = Math.random(); // random number
                            break;
                        case 2:
                            n = 0; // always blank
                            break;
                        default: // just in case ;-)
                            throw new Error("Invalid question difficulty");
                    }
                    let ppart = document.createElement("span");
                    // 50% chance
                    if (n > 0.5) { // hint
                        if (allHint && index == this.parts.length - 1) { // prevent all hints
                            ppart = this.#createBlank(part);
                            allHint = false;
                        } else {
                            ppart = this.#createHint(part);
                            allBlank = false;
                        }
                    }
                    else { // blank
                        if (allBlank && index == this.parts.length - 1) { // prevent all blanks
                            ppart = this.#createHint(part);
                            allBlank = false;
                        } else {
                            ppart = this.#createBlank(part);
                            allHint = false;
                        }
                    }
                    pElement.appendChild(ppart);
                }
                else { // just plain text
                    pElement.appendChild(document.createTextNode(part));
                }
            }
            if (!/[.。?？!！'"’”…]$/.test(this.parts[this.parts.length - 1])) {
                pElement.appendChild(document.createTextNode(/[(zh)(cn)(ja)(jp)]]/gi.test(navigator.language) ?
                "。" : "." ));
            }
        }
        catch (e) { // whoa!
            console.error(e);
            pElement.innerHTML = "Error while creating question.";
        }
        divElement.appendChild(pElement); // finally!
        return divElement;
    }
}
Question._answers = new Map();
class KeywordedQuestion extends Question { // keyworded questions encapsulation
    constructor(keyword, ...parts) {
        super(...parts);
        this._keyword = keyword;
    }
    get keyword() {
        return this._keyword;
    }
}
class ReferenceQuestion extends KeywordedQuestion { // questions that can be referred to
    constructor(refIndex, keyword, ...parts) {
        super(keyword, ...parts);
        this._refIndex = refIndex;
    }
    get refIndex() { // get starting reference index
        return this._refIndex;
    }
}
const questions = new Array();
const mainContainer = document.getElementById("main-container"); // main container
const mistakesContainer = document.getElementById("mistakes-container"); // mistakes container
const difficultyLabel = document.getElementById("question-difficulty-label-2"); // difficulty label
const commitContainer = document.getElementById("commit-container"); // commit container
var questionCount = 10;
var questionDifficulty = 1;
function isSpecialChararcter(character) {
    return (character === "[" ||
        character === "]" ||
        character === "{" ||
        character === "}" ||
        character === "|" ||
        character === "$" ||
        character === "%");
}
function main(questionLibrary) {
    questions.length = 0;
    var exhr = new EnhancedXMLHttpRequest(window.location.origin.indexOf("github") > 0
        ? window.location.href + "/assets/" + questionLibrary + ".qst"
        : window.location.origin + "/assets/" + questionLibrary + ".qst", "GET");
    exhr.send();
    exhr.getResponse().then((response) => {
        let rresponse = response.replace(/ /g, "");
        let lines = rresponse.split("\n");
        for (let i = 0; i < lines.length; i++) {
            try {
                let line = lines[i]; // used for parsing
                let keyword = "none"; // determines KeywordedQuestion type
                let refIndex = -1; // determines ReferenceQuestion type
                let parts = new Array(); // normal question parts
                let ref = null; // reference question parsing
                let partBuffer = ""; // used for parsing
                for (let j = 0; j < line.length; j++) {
                    switch (line[j]) {
                        case "[":
                            if (line.indexOf("]", j) < 0)
                                throw new Error("Missing closing bracket.");
                            keyword = line.substring(j + 1, line.indexOf("]", j));
                            j = line.indexOf("]", j);
                            break;
                        case "|":
                            refIndex = parts.length;
                            break;
                        case "$":
                            if (line.indexOf("$", j + 1) < 0)
                                throw new Error("Missing closing sign.");
                            parts.push(line.substring(j, line.indexOf("$", j + 1) + 1));
                            j = line.indexOf("$", j + 1);
                            break;
                        case "{":
                            if (line.indexOf("}", j) < 0)
                                throw new Error("Missing closing brace.");
                            let refKeyword = line.substring(j + 1, line.indexOf("}", j));
                            let temp = questions.find((question, _index, _arr) => {
                                return (question instanceof ReferenceQuestion &&
                                    question.keyword == refKeyword);
                            });
                            if (temp) {
                                ref = temp;
                                for (let k = ref.refIndex; k < ref.parts.length; k++) {
                                    parts.push(ref.parts[k]);
                                }
                            }
                            else {
                                console.log(`Reference to ${refKeyword} not found.`);
                                parts.push(line.substring(j, line.indexOf("}", j) + 1));
                            }
                            j = line.indexOf("}", j);
                            break;
                        default:
                            partBuffer += line[j];
                            if (j === line.length - 1 ||
                                isSpecialChararcter(line[j + 1])) {
                                parts.push(partBuffer);
                                partBuffer = "";
                            }
                            break;
                    }
                }
                if (refIndex !== -1) {
                    questions.push(new ReferenceQuestion(refIndex, keyword, ...parts));
                }
                else if (keyword !== "none") {
                    questions.push(new KeywordedQuestion(keyword, ...parts));
                }
                else if (parts.length > 0) {
                    questions.push(new Question(...parts));
                }
            }
            catch (e) {
                console.error(e);
                console.log(`Error parsing line ${i + 1}`);
            }
        }
        onReset();
    }, (error) => {
        console.error(error);
        mainContainer.innerHTML = "Error while loading questions.";
    });
}
function onReset() {
    mainContainer.innerHTML = "";
    Question.answers.clear();
    mistakesContainer.innerHTML = "";
    let questionsCopy = questions.slice();
    for (let i = 0; i < questionCount; i++) {
        let index = Math.floor(Math.random() * questionsCopy.length);
        mainContainer.appendChild(questionsCopy[index].toHTMLDivElement());
        questionsCopy.splice(index, 1);
    }
}
function onSubmit() {
    mistakesContainer.innerHTML = "";
    let mistakes = new Array();
    for (let input of document.getElementsByTagName("input")) {
        if (input.id.startsWith("answer-")) {
            if (input.value == "") {
                alert("你还未完成所有题目！不会的题目请输入任意字符！");
                return;
            }
            if (input.value === Question.answers.get(input.id)) {
                input.style.color = "green";
                input.style.backgroundColor = "#87ff9b67";
            }
            else {
                input.style.color = "red";
                input.style.backgroundColor = "#ff878767";
                let mistakeDiv = document.createElement("div");
                mistakeDiv.innerHTML = `<p>第${input.id.replace(/\D/g, "")}空错误，你的答案：${input.value}，正确答案：${Question.answers.get(input.id)}</p>`;
                mistakes.push(mistakeDiv);
            }
        }
    }
    for (let mistake of mistakes) {
        mistakesContainer.appendChild(mistake);
    }
}
function changeDifficulty(difficulty) {
    switch (difficulty) {
        case 0:
            questionDifficulty = 0;
            difficultyLabel.innerHTML = "无空格，纯文字";
            break;
        case 1:
            questionDifficulty = 1;
            difficultyLabel.innerHTML = "50%几率空格";
            break;
        case 2:
            questionDifficulty = 2;
            difficultyLabel.innerHTML = "全空格";
            break;
    }
}
main("lunyu_only_text");
var exhr2 = new EnhancedXMLHttpRequest("https://api.github.com/repos/LeChocolatChaud/gushiwen/commits/main", "GET", {
    accept: "application/vnd.github.v3+json",
});
exhr2.send();
exhr2.getResponse().then((response) => {
    let root = JSON.parse(response);
    let commit = root.commit;
    let committer = commit.committer;
    let date = new Date(committer.date);
    let dateString = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    let timeString = `${date.getHours()}:${date.getMinutes() < 10 ? "0" : ""}${date.getMinutes()}`;
    let commitString = `更新时间：${dateString} ${timeString} <br> 更新信息：${commit.message} <br> 更新人：${committer.name} ${committer.email}`;
    commitContainer.innerHTML = commitString;
}, (error) => {
    console.error(error);
});
function switchCommitContainerVisibility() {
    if (commitContainer.style.display === "none") {
        commitContainer.style.display = "block";
    }
    else {
        commitContainer.style.display = "none";
    }
}
