import { useEffect, useState } from "react";

const MY_GITHUB_USERNAMES = [
    "kumarhimanshu2006",
   
];

const FALLBACK_FEATURED_USERNAMES = [
    "octocat",
    "torvalds",
    "gaearon",
    "sindresorhus",
    "yyx990803",
    "defunkt",
    "getify",
    "addyosmani",
    "fabpot",
    "pjhyett",
];

const FALLBACK_INDIAN_USERNAMES = [
    "gaurav-nelson",
    "harishchouhan",
    "ritikmittal",
    "simplabhi",
    "sunil078",
];

function buildUserProfile(username) {
    return {
        id: username,
        login: username,
        avatar_url: `https://github.com/${username}.png?size=200`,
        html_url: `https://github.com/${username}`,
        type: "User",
    };
}

function Body() {
    const [profiles, setProfiles] = useState([]);
    const [indianProfiles, setIndianProfiles] = useState([]);
    const [myProfiles, setMyProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusMessage, setStatusMessage] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState(null);
    const [searchLoading, setSearchLoading] = useState(false);
    const [lastRefreshed, setLastRefreshed] = useState(null);
    const [selectedProfileCount, setSelectedProfileCount] = useState(0);

    async function safeJsonFetch(url) {
        const response = await fetch(url);
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || `Failed to load ${url} (${response.status})`);
        }
        return data;
    }

    async function generateProfile() {
        setLoading(true);
        setStatusMessage("");
        try {
            const randomSince = Math.floor(Math.random() * 200000);
            const data = await safeJsonFetch(`https://api.github.com/users?since=${randomSince}&per_page=10`);
            if (Array.isArray(data)) {
                setProfiles(data);
            } else {
                setProfiles(FALLBACK_FEATURED_USERNAMES.map(buildUserProfile));
                setStatusMessage("GitHub API returned an unexpected response. Showing fallback featured profiles.");
            }
        } catch (fetchError) {
            setStatusMessage("GitHub API rate limit reached or network issue. Showing fallback featured profiles.");
            setProfiles(FALLBACK_FEATURED_USERNAMES.map(buildUserProfile));
        } finally {
            setLoading(false);
            setLastRefreshed(new Date());
        }
    }

    async function fetchIndianProfiles() {
        try {
            const randomPage = Math.floor(Math.random() * 10) + 1;
            const result = await safeJsonFetch(
                `https://api.github.com/search/users?q=location:india&per_page=10&page=${randomPage}`
            );
            setIndianProfiles(Array.isArray(result.items) ? result.items : FALLBACK_INDIAN_USERNAMES.map(buildUserProfile));
        } catch (fetchError) {
            setStatusMessage((current) => current || "GitHub API rate limit reached or network issue. Showing fallback Indian profiles.");
            setIndianProfiles(FALLBACK_INDIAN_USERNAMES.map(buildUserProfile));
        }
    }

    async function fetchMyProfiles() {
        try {
            const results = await Promise.allSettled(
                MY_GITHUB_USERNAMES.map(async (username) => {
                    const data = await safeJsonFetch(`https://api.github.com/users/${username}`);
                    return data.message ? buildUserProfile(username) : data;
                })
            );
            const profiles = results.map((result, index) => {
                if (result.status === "fulfilled" && result.value) {
                    return result.value;
                }
                return buildUserProfile(MY_GITHUB_USERNAMES[index]);
            });
            if (results.some((result) => result.status !== "fulfilled")) {
                setStatusMessage((current) => current || "GitHub API rate limit reached or network issue. Showing fallback my profiles.");
            }
            setMyProfiles(profiles);
        } catch (fetchError) {
            setStatusMessage((current) => current || "GitHub API rate limit reached or network issue. Showing fallback my profiles.");
            setMyProfiles(MY_GITHUB_USERNAMES.map(buildUserProfile));
        }
    }

    async function fetchServerProfiles(query) {
        const trimmedQuery = query.trim();
        if (!trimmedQuery) {
            return [];
        }

        if (/^\d+$/.test(trimmedQuery)) {
            try {
                const profile = await safeJsonFetch(`https://api.github.com/user/${trimmedQuery}`);
                return profile && profile.id ? [profile] : [];
            } catch (error) {
                return [];
            }
        }

        const searchResult = await safeJsonFetch(
            `https://api.github.com/search/users?q=${encodeURIComponent(trimmedQuery)}+in:login&per_page=10`
        );
        return Array.isArray(searchResult.items) ? searchResult.items : [];
    }

    async function handleSearch(event) {
        if (event) {
            event.preventDefault();
        }

        const trimmedQuery = searchQuery.trim();
        if (!trimmedQuery) {
            setStatusMessage("Please enter a GitHub username or profile ID.");
            setSearchResults(null);
            setSelectedProfileCount(0);
            return;
        }

        setSearchLoading(true);
        setStatusMessage("");
        setSearchResults(null);

        try {
            const results = await fetchServerProfiles(searchQuery);
            setSearchResults(results);
            setSelectedProfileCount(results.length);
            if (!results || results.length === 0) {
                setStatusMessage("No profiles found for that name or ID.");
            }
        } catch (error) {
            setStatusMessage("Unable to search GitHub right now. Please try again later.");
        } finally {
            setSearchLoading(false);
        }
    }

    function handleRefresh() {
        setSearchQuery("");
        setSearchResults(null);
        setSelectedProfileCount(0);
        setStatusMessage("");
        generateProfile();
        fetchIndianProfiles();
        fetchMyProfiles();
    }

    useEffect(() => {
        generateProfile();
        fetchIndianProfiles();
        fetchMyProfiles();
    }, []);

    return (
        <main className="content">
            <section className="intro">
                {/* <div>
                    <p className="section-label">Live GitHub data</p>
                    <h2>Featured Developer Cards</h2>
                    <p>
                        Each card shows a GitHub user with a profile image and quick access to their public profile page.
                    </p>
                </div> */}
            </section>

            <section className="profile-section search-panel">
                <div className="section-header">
                    <p className="section-label">Profile Search</p>
                    <h2>Search by Username or ID</h2>
                    <p>Search GitHub directly by username or profile ID. Refresh loads a new random featured set each time.</p>
                </div>

                <form className="search-controls" onSubmit={handleSearch}>
                    <input
                        type="search"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search by username or profile ID"
                        className="search-input"
                    />
                    <button type="submit" className="search-button" disabled={searchLoading}>
                        {searchLoading ? "Searching…" : "Search"}
                    </button>
                    <button type="button" className="search-button secondary" onClick={handleRefresh}>Refresh</button>
                </form>

                {searchResults !== null && (
                    <p className="search-summary">Selected profiles count: {selectedProfileCount}</p>
                )}

                {lastRefreshed && (
                    <p className="refresh-note">Last refreshed: {lastRefreshed.toLocaleTimeString()}</p>
                )}
            </section>

            {searchResults !== null && (
                <section className="profile-section">
                    <div className="section-header">
                        <p className="section-label">Search Results</p>
                        <h2>Found Profiles</h2>
                        <p>
                            Showing profiles that match your search query. Found {searchResults.length} profile{searchResults.length === 1 ? "" : "s"}.
                        </p>
                    </div>

                    {searchResults.length > 0 ? (
                        <section className="profiles" id="search-results">
                            {searchResults.map((user) => (
                                <article key={`${user.id}-search`} className="cards">
                                    <img src={user.avatar_url} alt={`${user.login} avatar`} />
                                    <div className="card-body">
                                        <h3>{user.login}</h3>
                                        <span className="badge">{user.type}</span>
                                    </div>
                                    <a href={user.html_url} target="_blank" rel="noreferrer noopener">
                                        View Profile
                                    </a>
                                </article>
                            ))}
                        </section>
                    ) : (
                        <div className="empty-results">No matching profiles found. Try a different username or ID.</div>
                    )}
                </section>
            )}

            {myProfiles.length > 0 && (
                <section className="profile-section">
                    <div className="section-header">
                        <p className="section-label">My Profiles</p>
                        <h2>My GitHub Profiles</h2>
                        <p>
                            A custom section showing up to my GitHub profiles .
                        </p>
                    </div>

                    <section className="profiles" id="my-profile">
                        {myProfiles.map((profile) => (
                            <article key={profile.id} className="cards">
                                <img src={profile.avatar_url} alt={`${profile.login} avatar`} />
                                <div className="card-body">
                                    <h3>{profile.login}</h3>
                                    <span className="badge">{profile.type}</span>
                                </div>
                                <a href={profile.html_url} target="_blank" rel="noreferrer noopener">
                                    View Profile
                                </a>
                            </article>
                        ))}
                    </section>
                </section>
            )}

            {statusMessage && <div className="error-message">{statusMessage}</div>}

            {loading ? (
                <div className="loader">Loading profiles...</div>
            ) : (
                <section className="profiles" id="profiles">
                    {profiles.map((user) => (
                        <article key={user.id} className="cards">
                            <img src={user.avatar_url} alt={`${user.login} avatar`} />
                            <div className="card-body">
                                <h3>{user.login}</h3>
                                <span className="badge">{user.type}</span>
                            </div>
                            <a href={user.html_url} target="_blank" rel="noreferrer noopener">
                                View Profile
                            </a>
                        </article>
                    ))}
                </section>
            )}

            <section className="profile-section">
                <div className="section-header">
                    <p className="section-label">Indian Developers</p>
                    <h2>Indian GitHub Profiles</h2>
                    <p>
                        Discover active GitHub users from India with public profiles and strong open source presence.
                    </p>
                </div>

                <section className="profiles" id="india-profiles">
                    {indianProfiles.map((user) => (
                        <article key={user.id} className="cards">
                            <img src={user.avatar_url} alt={`${user.login} avatar`} />
                            <div className="card-body">
                                <h3>{user.login}</h3>
                                <span className="badge">{user.type}</span>
                            </div>
                            <a href={user.html_url} target="_blank" rel="noreferrer noopener">
                                View Profile
                            </a>
                        </article>
                    ))}
                </section>
            </section>
        </main>
    );
}

export default Body;