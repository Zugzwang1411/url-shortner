document.addEventListener("DOMContentLoaded", () => {
  const modalOverlay = document.querySelector(".modal-overlay");
  const modal = document.querySelector(".modal");
  const modalForm = document.querySelector(".modal-form");
  const doneButton = document.querySelector(".done-button");
  const searchButton = document.querySelector(".search-button");
  const addNewButton = document.querySelector(".add-new-button");
  const searchInput = document.querySelector(".search-input");
  const modalResult = document.querySelector(".modal-result");
  const searchResultsContainer = document.querySelector(".search-results");
  const signOutButton = document.querySelector(".sign-out-button");

  const isAuthenticated = checkAuthentication();

  if (isAuthenticated) {
    loadURLShortener();
  } else {
    redirectToLogin();
  }

  function checkAuthentication() {
    const token = localStorage.getItem('token');
    if (token) {
      return fetch('/verify', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        }
      })
        .then(function(response) {
          return response.ok;
        })
        .catch(function(error) {
          console.error('Error:', error);
          return false;
        });
    }
    return false;
  }

  function redirectToLogin() {
    window.location.href = '/login.html';
  }
  signOutButton.addEventListener("click", () => {
    signOut();
  });

  function signOut() {
    localStorage.removeItem('token');
    redirectToLogin();
  }

  function loadURLShortener() {
    getAllURLs()
      .then((data) => {
        showSearchResults(data);
      })
      .catch((error) => {
        showError(error);
      });

    searchInput.addEventListener("input", () => {
      const searchTerm = searchInput.value;
      if (searchTerm.length >= 3) {
        autoCompleteSearch(searchTerm)
          .then((data) => {
            showAutoCompleteResults(data);
          })
          .catch((error) => {
            showError(error);
          });
      } else {
        searchResultsContainer.innerHTML = "";
      }
    });

    modalForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const urlInput = document.querySelector(".url-input");
      const noteInput = document.querySelector(".note-input");
      const url = urlInput.value;
      const note = noteInput.value;

      shortenURL(url, note)
        .then((data) => {
          showResult(data);
        })
        .catch((error) => {
          showError(error);
        });

      urlInput.value = "";
      noteInput.value = "";
    });

    doneButton.addEventListener("click", () => {
      closeModal();
    });

    addNewButton.addEventListener("click", () => {
      openModal();
    });

    searchButton.addEventListener("click", () => {
      const searchTerm = searchInput.value;
      searchURLs(searchTerm)
        .then((data) => {
          showSearchResults(data);
        })
        .catch((error) => {
          showError(error);
        });

      searchInput.value = "";
    });

    async function getAllURLs() {
      const token = localStorage.getItem('token');
      const response = await fetch('/all', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        }
      });
      const data = await response.json();
      return data.results;
    }

    async function shortenURL(url, note) {
      const token = localStorage.getItem('token');
      const response = await fetch("/new", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Authorization': token
        },
        body: JSON.stringify({ url, note }),
      });
      const data = await response.json();
      return data;
    }

    async function searchURLs(term) {
      const token = localStorage.getItem('token');
      const response = await fetch(`/search?term=${term}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        }
      });
      const data = await response.json();
      return data.results;
    }

    function openModal() {
      modalOverlay.style.display = "block";
      modal.style.display = "block";
    }

    function closeModal() {
      modalOverlay.style.display = "none";
      modal.style.display = "none";
      modalResult.innerHTML = "";
    }

    function showError(error) {
      modalResult.innerHTML = `<p class="error">${error}</p>`;
    }

    function showResult(data) {
      if (data.urlExists) {
        modalResult.innerHTML = `
          <p class="error">URL already exists!</p>
          <p>Shortened URL: <a href="${data.short_id}" target="_blank">${data.short_id}</a></p>
          <p>Note: ${data.note}</p>
        `;
      } else {
        modalResult.innerHTML = `
          <p>Shortened URL: <a href="${data.short_id}" target="_blank">${data.short_id}</a></p>
          <p>Note: ${data.note}</p>
        `;
      }
    }

    function showSearchResults(results) {
      searchResultsContainer.innerHTML = "";

      if (results.length === 0) {
        searchResultsContainer.innerHTML = "<p>No results found.</p>";
        return;
      }

      results.forEach((result) => {
        const resultCard = document.createElement("div");
        resultCard.classList.add("result-card");

        const title = document.createElement("h3");
        const titleLink = document.createElement("a");
        titleLink.href = result.short_id;
        titleLink.target = "_blank";
        titleLink.innerText = result.short_id;
        title.appendChild(titleLink);

        const originalURL = document.createElement("p");
        originalURL.innerHTML = `Original URL: <a href="${result.original_url}" target="_blank">${result.original_url}</a>`;

        const note = document.createElement("p");
        note.innerText = `Note: ${result.note}`;

        const clicks = document.createElement("p");
        clicks.innerText = `Clicks: ${result.clicks}`;

        resultCard.appendChild(title);
        resultCard.appendChild(originalURL);
        resultCard.appendChild(note);
        resultCard.appendChild(clicks);

        searchResultsContainer.appendChild(resultCard);
      });
    }

    async function autoCompleteSearch(term) {
      const token = localStorage.getItem('token');
      const response = await fetch(`/autocomplete?term=${term}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        }
      });
      const data = await response.json();
      return data.results;
    }

    function showAutoCompleteResults(results) {
      searchResultsContainer.innerHTML = "";

      if (results.length === 0) {
        searchResultsContainer.innerHTML = "<p>No results found.</p>";
        return;
      }

      results.forEach((result) => {
        const resultCard = document.createElement("div");
        resultCard.classList.add("result-card");

        const title = document.createElement("p");
        title.innerText = result;

        resultCard.appendChild(title);
        searchResultsContainer.appendChild(resultCard);
      });
    }
  }
});
