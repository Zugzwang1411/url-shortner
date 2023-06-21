document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (token) {
    verifyToken(token)
      .then(() => {
        redirectToIndex();
        alert("You are already Logged In!!");
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  }

  document
    .getElementById("login-form")
    .addEventListener("submit", function (event) {
      event.preventDefault();

      var username = document.getElementsByName("username")[0].value;
      var password = document.getElementsByName("password")[0].value;

      fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: username, password: password }),
      })
        .then(function (response) {
          if (response.ok) {
            return response.json();
          } else {
            throw new Error("Invalid username or password. Please try again.");
          }
        })
        .then(function (data) {
          localStorage.setItem("token", data.token);
          redirectToIndex();
        })
        .catch(function (error) {
          console.error("Error:", error);
          alert(error.message);
        });
    });

  function verifyToken(token) {
    return fetch("/verify", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
    }).then(function (response) {
      if (response.ok) {
        return response.json();
      } else {
        throw new Error("Token verification failed.");
      }
    });
  }

  function redirectToIndex() {
    window.location.href = "/index.html";
  }
});
