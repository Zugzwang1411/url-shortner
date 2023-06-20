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
    .getElementById("registration-form")
    .addEventListener("submit", function (event) {
      event.preventDefault();

      var username = document.getElementsByName("username")[0].value;
      var password = document.getElementsByName("password")[0].value;
      var confirmPassword =
        document.getElementsByName("confirmPassword")[0].value;

      if (password !== confirmPassword) {
        alert("Passwords do not match. Please try again.");
        return;
      }
      fetch("/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: username, password: password }),
      })
        .then(function (response) {
          if (response.ok) {
            alert("Registration successful. You can now login.");
            window.location.href = "/login.html";
          } else {
            alert("An error occurred during registration. Please try again.");
          }
        })
        .catch(function (error) {
          console.error("Error:", error);
          alert(
            "An error occurred during registration. Please try again later."
          );
        });
    });

  async function verifyToken(token) {
    const response = await fetch("/verify", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
    });
    if (response.ok) {
      return response.json();
    } else {
      throw new Error("Token verification failed.");
    }
  }

  function redirectToIndex() {
    window.location.href = "/index.html";
  }
});
