# secureChat

Inlämningsuppgift:

initialize: "npm i"
start with nodemon: "npm run devStart"
start defualt: "npm run start"


document.addEventListener("DOMContentLoaded", function () {
  async function login() {
    const username = document.querySelector(".login").value;
    const password = document.querySelector(".password").value;

    console.log("username: ", username);
    console.log("password:", password);

    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username: username, password: password }),
    });
    console.log(response);

    if (response.status === 200) {
      const nameToken = await response.text();
      //spara ner username i global variabel
      currentUser = username;
      // Do something with the token, like storing it in local storage
      localStorage.setItem("nameToken", nameToken);
    } else if (response.status === 400) {
      // Show an error message to the user that the input is missing or incorrect
      console.error("Bad request: missing or incorrect input");
    } else if (response.status === 401) {
      // Show an error message to the user that the password is incorrect
      console.error("Unauthorized: incorrect password");
    }
  }

  // Attach the login function to the button click event

  document.querySelector(".signIn").addEventListener("click", login);
});