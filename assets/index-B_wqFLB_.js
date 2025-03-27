var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep)
      return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
const MOVIE_COUNT = Object.freeze({
  UNIT: 20,
  MAX_PAGE: 500
});
const ERROR_MESSAGES = Object.freeze({
  NO_RESULT: "검색 결과가 없습니다.",
  MOVIE_FETCH_FAILED: "영화 정보를 불러오는 데 실패했습니다. 새로고침 해 주세요."
});
class Store {
  constructor(initialState) {
    __publicField(this, "state");
    __publicField(this, "subscribers");
    this.state = initialState;
    this.subscribers = [];
  }
  subscribe(fn) {
    this.subscribers.push(fn);
    fn(this.state);
  }
  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.subscribers.forEach((fn) => fn(this.state));
  }
  getState() {
    return this.state;
  }
}
const store = new Store({
  movies: [],
  query: "",
  searchedMoviesLength: 0,
  isLoading: false,
  errorMessage: ""
});
const fetchPopularMovies = async (page = 1) => {
  try {
    const response = await fetch(
      `${"https://api.themoviedb.org/3"}/movie/popular?language=ko-KR&page=${page}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${"eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIzNjM3Yjc0MTQ4Y2MwYTE1MTJiOGRmNzQxZWEwNmY3OCIsIm5iZiI6MTYyODg0NjUzOC4zNDA5OTk4LCJzdWIiOiI2MTE2MzljYTk5ZDVjMzAwNDZlZmE2YzQiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.9iAbnC3Evw7Zj9EkIraokKWra58lKs3iYZe63V45MKI"}`
        }
      }
    );
    if (!response.ok) {
      throw new Error(ERROR_MESSAGES.MOVIE_FETCH_FAILED);
    }
    const data = await response.json();
    return data.results;
  } catch (error) {
    if (error instanceof Error) {
      store.setState({ errorMessage: error.message });
    }
    return [];
  }
};
const fetchSearchedMovies = async (query, page = 1) => {
  try {
    const response = await fetch(
      `${"https://api.themoviedb.org/3"}/search/movie?query=${query}&include_adult=false&language=ko-KR&page=${page}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${"eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIzNjM3Yjc0MTQ4Y2MwYTE1MTJiOGRmNzQxZWEwNmY3OCIsIm5iZiI6MTYyODg0NjUzOC4zNDA5OTk4LCJzdWIiOiI2MTE2MzljYTk5ZDVjMzAwNDZlZmE2YzQiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.9iAbnC3Evw7Zj9EkIraokKWra58lKs3iYZe63V45MKI"}`
        }
      }
    );
    if (!response.ok) {
      throw new Error(ERROR_MESSAGES.MOVIE_FETCH_FAILED);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof Error) {
      store.setState({ errorMessage: error.message });
    }
    return null;
  }
};
function SearchBarRender() {
  const params = new URLSearchParams(window.location.search);
  const queryValue = params.get("query") || "";
  return (
    /* html */
    `
    <div class="search-bar-container">
      <form id="search-form" class="search-form" data-testid="search-form">
        <input 
          type="text" 
          name="query" 
          value="${queryValue}" 
          data-testid="search-input" 
          class="search-bar" 
          placeholder="검색어를 입력하세요" 
          autocomplete="off" 
        />
        <button type="submit" class="search-button">
          <img src="./images/search.png" alt="search" width="16" height="16" />
        </button>
      </form>
    </div>
  `
  );
}
function SearchBarMount() {
  const $searchForm = document.querySelector("#search-form");
  if ($searchForm) {
    $searchForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData($searchForm);
      const query = formData.get("query");
      if (!query) return;
      const url = new URL(window.location);
      url.searchParams.set("query", query);
      window.history.pushState({}, "", url);
      const searchedMovies = await fetchSearchedMovies(query);
      if (searchedMovies) {
        store.setState({
          movies: searchedMovies.results,
          query,
          searchedMoviesLength: searchedMovies.total_results
        });
      }
    });
  }
}
function HeaderRender() {
  return (
    /* html */
    `
    <header id="header" class="header">
      <div class="header-container">
        <h1 class="logo">
          <a href="/javascript-movie-review">
            <img src="./images/logo.png" alt="MovieList" />
          </a>
        </h1>
        ${SearchBarRender()}
        <div class="empty"></div>
      </div>
    </header>
  `
  );
}
function HeaderMount() {
  SearchBarMount();
}
function FooterRender() {
  return (
    /*html*/
    `
    <footer class="footer">
      <p>
        <img src="./images/woowacourse_logo.png" width="180" />
      </p>
      <p>&copy; 우아한테크코스 All Rights Reserved.</p>
    </footer>
  `
  );
}
function BannerRender({ vote_average, title }) {
  return (
    /* html */
    `
    <div id="banner" class="background-container">
      <div class="overlay" aria-hidden="true" ></div>
      <div class="top-rated-container">
        <div class="top-rated-movie">
          <div class="rate">
            <img src="./images/star_empty.png" class="star" />
            <span class="rate-value">${vote_average}</span>
          </div>
          <div class="title">${title}</div>
          <button class="primary detail">자세히 보기</button>
        </div>
      </div>
    </div>
  `
  );
}
function SkeletonBannerRender() {
  return (
    /* html */
    `
    <div id="banner" class="background-container skeleton-banner">
      <div class="overlay" aria-hidden="true"></div>
      <div class="skeleton-banner-content">
      </div>
    </div>
  `
  );
}
function ListTitleRender({ query }) {
  const title = query ? `"${query}" 검색 결과` : "지금 인기 있는 영화";
  return (
    /* html */
    `
    <h2 id="list-title">${title}</h2>
  `
  );
}
function MovieItemRender({ poster_path, title, vote_average }) {
  const imageUrl = poster_path ? `${"https://image.tmdb.org/t/p/w500"}${poster_path}` : "./images/logo.png";
  return (
    /* html */
    `
    <li>
      <div class="item">
        <img class="thumbnail" src="${imageUrl}" alt="${title}" />
        <div class="item-desc">
          <p class="rate">
            <img src="./images/star_empty.png" class="star" />
            <span>${vote_average}</span>
          </p>
          <strong>${title}</strong>
        </div>
      </div>
    </li>
  `
  );
}
function MoreButtonRender() {
  return (
    /* html */
    `
    <button id="more-button" class="primary more" data-testid="more-button">더 보기</button>
  `
  );
}
function MoreButtonMount() {
  const $button = document.querySelector("#more-button");
  if ($button) {
    $button.addEventListener("click", async () => {
      const state = store.getState();
      const currentPage = Math.floor(state.movies.length / MOVIE_COUNT.UNIT) + 1;
      store.setState({ ...state, isLoading: true });
      if (!state.query) {
        const newMovies = await fetchPopularMovies(currentPage);
        store.setState({
          ...store.getState(),
          movies: [...state.movies, ...newMovies],
          isLoading: false
        });
        if (state.movies.length >= MOVIE_COUNT.MAX_PAGE * MOVIE_COUNT.UNIT) {
          $button.remove();
        }
      } else {
        const newMoviesData = await fetchSearchedMovies(
          state.query,
          currentPage
        );
        store.setState({
          ...store.getState(),
          movies: [...state.movies, ...newMoviesData.results],
          isLoading: false
        });
        if (state.movies.length >= state.searchedMoviesLength) {
          $button.remove();
        }
      }
    });
  }
}
function SkeletonMovieItemRender() {
  return (
    /* html */
    `
    <li class="skeleton-item">
      <div class="skeleton-thumbnail"></div>
      <div class="skeleton-desc">
        <div class="skeleton-rate"></div>
        <div class="skeleton-title"></div>
      </div>
    </li>
  `
  );
}
function MovieListRender({
  movies,
  query,
  searchedMoviesLength,
  isLoading
}) {
  const showMoreButton = !query || movies.length < searchedMoviesLength;
  let movieContent = "";
  if (isLoading) {
    movieContent = new Array(MOVIE_COUNT.UNIT).fill(0).map(() => SkeletonMovieItemRender()).join("");
  } else if (movies.length === 0 && query) {
    movieContent = `<div></div>
                    <div></div>
                    <div class="center">
                      <img src="./images/not_found.png"/>
                      <h2 data-testid='no-result-message'>${ERROR_MESSAGES.NO_RESULT}</h2>
                    </div>`;
  } else {
    movieContent = movies.map((movie) => MovieItemRender(movie)).join("");
  }
  return (
    /* html */
    `
    <main>
      <section>
        ${ListTitleRender({ query })}
        <ul id="movie-list" class="thumbnail-list" data-testid="movie-list">
          ${movieContent}
        </ul>
        ${showMoreButton ? MoreButtonRender() : ""}
      </section>
    </main>
  `
  );
}
function MovieListMount() {
  MoreButtonMount();
}
async function initializeMovieDomain() {
  const state = store.getState();
  if (state.movies.length === 0) {
    store.setState({ ...state, isLoading: true });
    const movies = await fetchPopularMovies();
    store.setState({ ...store.getState(), movies, isLoading: false });
  }
}
function renderMovieDomain() {
  const state = store.getState();
  return MovieListRender({
    movies: state.movies,
    query: state.query,
    searchedMoviesLength: state.searchedMoviesLength,
    isLoading: state.isLoading
  });
}
function mountMovieDomain() {
  MovieListMount();
}
async function syncSearchStateWithURL() {
  const params = new URLSearchParams(window.location.search);
  const query = params.get("query");
  store.setState({ ...store.getState(), isLoading: true });
  if (query) {
    const searchedMovies = await fetchSearchedMovies(query);
    if (searchedMovies) {
      store.setState({
        movies: searchedMovies.results,
        query,
        searchedMoviesLength: searchedMovies.total_results,
        isLoading: false
      });
    } else {
      store.setState({ ...store.getState(), isLoading: false });
    }
  } else {
    store.setState({
      ...store.getState(),
      movies: [],
      query: "",
      searchedMoviesLength: 0,
      isLoading: true
    });
    await initializeMovieDomain();
  }
}
class App {
  constructor($target) {
    this.$target = $target;
    store.subscribe(() => this.render());
    this.toastTimeout = null;
  }
  async initialize() {
    await syncSearchStateWithURL();
    this.render();
  }
  render() {
    const state = store.getState();
    this.$target.innerHTML = `
      <div id="wrap">
        ${HeaderRender()}
        ${!state.query ? state.movies.length ? BannerRender(state.movies[0]) : SkeletonBannerRender() : ""}
        <div class="container">
          ${renderMovieDomain()}
        </div>
        ${FooterRender()}
      </div>
      ${state.errorMessage ? `<div class="toast">${state.errorMessage}</div>` : ""}
    `;
    this.mount();
    if (state.errorMessage && !this.toastTimeout) {
      this.toastTimeout = setTimeout(() => {
        store.setState({ ...store.getState(), errorMessage: null });
        this.toastTimeout = null;
      }, 3e3);
    }
  }
  mount() {
    HeaderMount();
    mountMovieDomain();
    const state = store.getState();
    const $banner = document.querySelector("#banner");
    if (state.movies.length && $banner) {
      $banner.style.backgroundImage = `url(${"https://image.tmdb.org/t/p/original"}${state.movies[0].backdrop_path})`;
    }
    window.addEventListener("scroll", () => {
      const $header = document.querySelector("#header");
      if ($header) {
        if (window.scrollY > 0) {
          $header.classList.add("scrolled");
        } else {
          $header.classList.remove("scrolled");
        }
      }
    });
  }
}
const $app = document.getElementById("app");
const app = new App($app);
app.initialize();
window.addEventListener("popstate", async () => {
  await syncSearchStateWithURL();
});
