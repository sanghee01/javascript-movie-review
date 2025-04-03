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
const SCORE_MESSAGES = Object.freeze({
  2: "최악이예요",
  4: "별로예요",
  6: "보통이에요",
  8: "재미있어요",
  10: "명작이에요",
  CHOICE: "별점을 선택해주세요"
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
  initialSubscribe(subscribers) {
    subscribers.forEach((fn) => fn(this.state));
  }
  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.initialSubscribe(this.subscribers);
  }
  setMovies(movies) {
    this.setState({ ...this.state, movies });
  }
  setQuery(query) {
    this.setState({ ...this.state, query });
  }
  setSearchedMoviesLength(searchedMoviesLength) {
    this.setState({ ...this.state, searchedMoviesLength });
  }
  setLoading(isLoading) {
    this.setState({ ...this.state, isLoading });
  }
  setErrorMessage(errorMessage) {
    this.setState({ ...this.state, errorMessage });
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
const fetchAPI = async ({
  url,
  params
}) => {
  const query = params ? `?${new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      acc[key] = String(value);
      return acc;
    }, {})
  ).toString()}` : "";
  try {
    const response = await fetch(
      `${"https://api.themoviedb.org/3"}${url}${query}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${"eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIzNjM3Yjc0MTQ4Y2MwYTE1MTJiOGRmNzQxZWEwNmY3OCIsIm5iZiI6MTYyODg0NjUzOC4zNDA5OTk4LCJzdWIiOiI2MTE2MzljYTk5ZDVjMzAwNDZlZmE2YzQiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.9iAbnC3Evw7Zj9EkIraokKWra58lKs3iYZe63V45MKI"}`
        }
      }
    );
    if (!response.ok) throw new Error(ERROR_MESSAGES.MOVIE_FETCH_FAILED);
    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      store.setErrorMessage(error.message);
    }
    return null;
  }
};
const fetchPopularMovies = async (page = 1) => {
  const data = await fetchAPI({
    url: "/movie/popular",
    params: { language: "ko-KR", page }
  });
  return (data == null ? void 0 : data.results) ?? [];
};
const fetchSearchedMovies = async (query, page = 1) => {
  return await fetchAPI({
    url: "/search/movie",
    params: {
      query,
      include_adult: "false",
      language: "ko-KR",
      page
    }
  });
};
const fetchMovieDetail = async (movieId) => {
  const data = await fetchAPI({
    url: `/movie/${movieId}`,
    params: { language: "ko-KR" }
  });
  return data ?? {};
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
        store.setMovies(searchedMovies.results);
        store.setQuery(query);
        store.setSearchedMoviesLength(searchedMovies.total_results);
        window.scrollTo({ top: 0 });
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
function MovieItemRender({ id, poster_path, title, vote_average }) {
  const imageUrl = poster_path ? `${"https://image.tmdb.org/t/p/w500"}${poster_path}` : "./images/logo.png";
  return (
    /* html */
    `
    <li data-movie-id="${id}">
      <div class="item">
        <img class="thumbnail" src="${imageUrl}" alt="${title}" />
        <div class="item-desc">
          <p class="rate">
            <img class="star" src="./images/star_empty.png" alt="star" />
            <span>${vote_average}</span>
          </p>
          <strong>${title}</strong>
        </div>
      </div>
    </li>
  `
  );
}
function MovieItemMount() {
  const $movieItems = document.querySelectorAll("li[data-movie-id]");
  $movieItems.forEach((item) => {
    item.addEventListener("click", async () => {
      const movieId = item.getAttribute("data-movie-id");
      openDetailModal(movieId);
    });
  });
}
function DetailModalRender(movie) {
  if (!movie) return "";
  return (
    /* html */
    `
    <div class="modal-background active" id="$modalBackground" data-movie-id="${movie.id}">
      <div class="modal">
        <button class="close-modal" id="closeModal">
          <img src="./images/modal_button_close.png" />
        </button>
        <div class="modal-container">
          <div class="modal-image">
            <img src="https://image.tmdb.org/t/p/original${movie.poster_path}" alt="${movie.title}" />
          </div>
          <div class="modal-description">
            <div class="modal-description__title">
              <h2>${movie.title}</h2>
              <p class="category">
                ${movie.release_date} · ${movie.genres ? movie.genres.map((g) => g.name).join(", ") : ""}
              </p>
              <div class="rate">
                <span class="rate__title">평균</span>
                <div class="rate__bar">
                  <img src="./images/star_filled.png" class="star" />
                  <span>${movie.vote_average}</span>
                </div>
              </div>
            </div>
            <hr />
            <div class="score">
              <h3 >내 별점</h3>
              <div class="score__container">
                <div class="score__stars">
                  <img src="./images/star_empty.png" class="star" />
                  <img src="./images/star_empty.png" class="star" />
                  <img src="./images/star_empty.png" class="star" />
                  <img src="./images/star_empty.png" class="star" />
                  <img src="./images/star_empty.png" class="star" />
                </div>
                <div class="score__description">
                  <span class="score__description--text">${SCORE_MESSAGES.CHOICE}</span>
                  <span class="score__description--score">(<span class="score-number">0</span>/10)</span>
                </div>
              </div>

            </div>  
            <hr/>
            <div class="detail">
              <h3>줄거리</h3>
              ${movie.overview || "등록된 줄거리가 없습니다."}
            </div>
          </div>
        </div>
      </div>
    </div>
    `
  );
}
function DetailModalMount() {
  const $modalBackground = document.getElementById("$modalBackground");
  if (!$modalBackground) return;
  const $closeBtn = document.getElementById("closeModal");
  if ($closeBtn) {
    $closeBtn.addEventListener("click", () => {
      $modalBackground.remove();
    });
  }
  $modalBackground.addEventListener("click", (event) => {
    if (event.target === $modalBackground) {
      $modalBackground.remove();
    }
  });
  const escHandler = (event) => {
    if (event.key === "Escape") {
      $modalBackground.remove();
      window.removeEventListener("keydown", escHandler);
    }
  };
  window.addEventListener("keydown", escHandler);
  const $stars = $modalBackground.querySelectorAll(".score__stars .star");
  const $scoreNumber = $modalBackground.querySelector(".score-number");
  const $scoreDescriptionText = $modalBackground.querySelector(
    ".score__description--text"
  );
  const movieId = $modalBackground.getAttribute("data-movie-id");
  if (movieId && $scoreNumber && $scoreDescriptionText) {
    const storedRating = localStorage.getItem("userRating_" + movieId);
    if (storedRating) {
      const ratingValue = parseInt(storedRating, 10);
      $stars.forEach((star, i) => {
        star.src = i < ratingValue / 2 ? "./images/star_filled.png" : "./images/star_empty.png";
      });
      $scoreNumber.textContent = storedRating;
      updateScoreDescription(storedRating, $scoreDescriptionText);
    }
  }
  $stars.forEach((star, index) => {
    star.addEventListener("click", () => {
      $stars.forEach((star2, i) => {
        star2.src = i <= index ? "./images/star_filled.png" : "./images/star_empty.png";
      });
      const newRating = (index + 1) * 2;
      if ($scoreNumber) {
        $scoreNumber.textContent = newRating.toString();
      }
      if (movieId) {
        localStorage.setItem("userRating_" + movieId, newRating.toString());
      }
      if ($scoreDescriptionText) {
        updateScoreDescription(newRating.toString(), $scoreDescriptionText);
      }
    });
  });
}
function updateScoreDescription(ratingStr, element) {
  const rating = Number(ratingStr);
  if (rating === 2) {
    element.textContent = SCORE_MESSAGES[2];
  } else if (rating === 4) {
    element.textContent = SCORE_MESSAGES[4];
  } else if (rating === 6) {
    element.textContent = SCORE_MESSAGES[6];
  } else if (rating === 8) {
    element.textContent = SCORE_MESSAGES[8];
  } else if (rating === 10) {
    element.textContent = SCORE_MESSAGES[10];
  } else {
    element.textContent = SCORE_MESSAGES.CHOICE;
  }
}
async function openDetailModal(movieId) {
  try {
    const movieDetail = await fetchMovieDetail(movieId);
    if (!movieDetail) return;
    const modalHTML = DetailModalRender(movieDetail);
    document.body.insertAdjacentHTML("beforeend", modalHTML);
    DetailModalMount();
  } catch (error) {
    store.setErrorMessage(ERROR_MESSAGES.MOVIE_FETCH_FAILED);
  }
}
function BannerRender({ vote_average, title, id }) {
  return (
    /* html */
    `
    <div id="banner" class="background-container" >
      <div class="overlay" aria-hidden="true" ></div>
      <div class="top-rated-container">
        <div class="top-rated-movie">
          <div class="rate">
            <img src="./images/star_empty.png" class="star" />
            <span class="rate-value">${vote_average}</span>
          </div>
          <div class="title">${title}</div>
          <button class="primary detail" data-movie-id="${id}">자세히 보기</button>
        </div>
      </div>
    </div>
  `
  );
}
function BannerMount() {
  const $banner = document.getElementById("banner");
  if ($banner) {
    $banner.addEventListener("click", async (event) => {
      const $detailBtn = event.target.closest(".detail");
      if ($detailBtn) {
        const movieId = $detailBtn.getAttribute("data-movie-id");
        if (movieId) {
          await openDetailModal(movieId);
        }
      }
    });
  }
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
async function fetchMoreMovies(currentPage) {
  const state = store.getState();
  if (!state.query) {
    const newMovies = await fetchPopularMovies(currentPage);
    store.setLoading(false);
    store.setMovies([...state.movies, ...newMovies]);
  } else {
    const newMoviesData = await fetchSearchedMovies(state.query, currentPage);
    store.setLoading(false);
    store.setMovies([...state.movies, ...newMoviesData.results]);
  }
}
const throttle = (callback, delayTime) => {
  let timerId;
  return () => {
    if (timerId) return;
    timerId = setTimeout(() => {
      callback();
      timerId = null;
    }, delayTime);
  };
};
function MovieListRender({
  movies,
  query,
  searchedMoviesLength,
  isLoading
}) {
  let movieContent = "";
  if (isLoading) {
    movieContent = /* html */
    `
       <ul id="movie-list" class="thumbnail-list" data-testid="movie-list">
          ${new Array(MOVIE_COUNT.UNIT).fill(0).map(() => SkeletonMovieItemRender()).join("")}
        </ul>
      `;
  } else if (movies.length === 0 && query) {
    movieContent = /* html */
    `
        <div class="not-found-movie">
          <img src="./images/not_found.png"/>
          <h2 data-testid='no-result-message'>${ERROR_MESSAGES.NO_RESULT}</h2>
        </div>
        <ul id="movie-list" class="thumbnail-list" data-testid="movie-list"></ul>
      `;
  } else {
    movieContent = /* html */
    `
        <ul id="movie-list" class="thumbnail-list" data-testid="movie-list">
          ${movies.map((movie) => MovieItemRender(movie)).join("")}
        </ul>
    `;
  }
  return (
    /* html */
    `
    <main>
      <section class="movie-list-container">
        ${ListTitleRender({ query })}
        ${movieContent}
      </section>
    </main>
  `
  );
}
function MovieListMount() {
  MovieItemMount();
  window.addEventListener(
    "scroll",
    throttle(async () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 300) {
        const state = store.getState();
        const currentPage = Math.floor(state.movies.length / MOVIE_COUNT.UNIT) + 1;
        if (state.isLoading) return;
        if (!state.query && state.movies.length >= MOVIE_COUNT.MAX_PAGE * MOVIE_COUNT.UNIT) {
          return;
        }
        if (state.query && state.movies.length >= state.searchedMoviesLength) {
          return;
        }
        store.setLoading(true);
        await fetchMoreMovies(currentPage);
      }
    }, 1e3)
  );
}
async function initializeMovieDomain() {
  const state = store.getState();
  if (state.movies.length === 0) {
    store.setLoading(true);
    const movies = await fetchPopularMovies();
    store.setLoading(false);
    store.setMovies(movies);
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
  store.setLoading(true);
  if (query) {
    const searchedMovies = await fetchSearchedMovies(query);
    if (searchedMovies) {
      store.setLoading(false);
      store.setMovies(searchedMovies.results);
      store.setQuery(query);
      store.setSearchedMoviesLength(searchedMovies.total_results);
    } else {
      store.setLoading(false);
    }
  } else {
    store.setLoading(true);
    store.setMovies([]);
    store.setQuery("");
    store.setSearchedMoviesLength(0);
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
        store.setErrorMessage(state.errorMessage);
        this.toastTimeout = null;
      }, 3e3);
    }
  }
  mount() {
    HeaderMount();
    mountMovieDomain();
    BannerMount();
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
