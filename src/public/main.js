const searchContainer = document.querySelector('.search-container');
const searchInput = document.querySelector('.search-input');
const searchButton = document.querySelector('.search-button');
const addNewButton = document.querySelector('.add-new-button');
const modalOverlay = document.querySelector('.modal-overlay');
const modal = document.querySelector('.modal');
const modalForm = document.querySelector('.modal-form');
const modalResult = document.querySelector('.modal-result');
const doneButton = document.querySelector('.done-button');
const resultSection = document.querySelector('.result-section');
const searchResults = document.querySelector('.search-results');

searchButton.addEventListener('click', handleSearch);
addNewButton.addEventListener('click', openModal);
modalForm.addEventListener('submit', handleShortenURL);
doneButton.addEventListener('click', closeModal);

function handleSearch(event) {
  event.preventDefault();
  const searchTerm = searchInput.value.trim();
  if (searchTerm === '') {
    return;
  }
  searchURLs(searchTerm);
}

const searchURLs = (term) => {
  fetch(`/search?term=${encodeURIComponent(term)}`)
    .then(response => {
      if (!response.ok) {
        throw Error(response.statusText);
      }
      return response.json();
    })
    .then(data => {
      while (searchResults.hasChildNodes()) {
        searchResults.removeChild(searchResults.lastChild);
      }

      if (data.results.length === 0) {
        searchResults.insertAdjacentHTML('afterbegin', `
          <p>No matching URLs found</p>
        `);
        return;
      }

      const resultsList = document.createElement('ul');
      data.results.forEach(result => {
        const listItem = document.createElement('li');
        const anchor = document.createElement('a');
        anchor.href = result.original_url;
        anchor.textContent = `${location.origin}/${result.short_id}`;
        listItem.appendChild(anchor);
        resultsList.appendChild(listItem);
      });

      searchResults.appendChild(resultsList);
    })
    .catch(console.error);
};

function openModal() {
  modalOverlay.classList.add('active');
  modal.classList.add('active');
}

function closeModal() {
  modalOverlay.classList.remove('active');
  modal.classList.remove('active');
  modalForm.reset();
  modalResult.innerHTML = '';
}

function handleShortenURL(event) {
  event.preventDefault();
  const urlInput = modalForm.querySelector('.url-input');
  const url = urlInput.value.trim();
  if (url === '') {
    return;
  }
  shortenURL(url);
}
const shortenURL = (term) => {
  const input = modalForm.querySelector('.url-input');
  fetch('/new', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      url: input.value,
    })
  })
    .then(response => {
      if (!response.ok) {
        console.log('hihi')
        throw Error(response.statusText);
      }
      return response.json();
    })
    .then(data => {
      const resultHTML = `
        <div class="result">
          <a target="_blank" class="short-url" rel="noopener" href="/${data.short_id}">
            ${location.origin}/${data.short_id}
          </a>
        </div>`
        modalResult.innerHTML = resultHTML;
    })
    .catch(console.error)
}