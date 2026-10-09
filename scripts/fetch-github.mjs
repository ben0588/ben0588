// Fetch profile stats from the GitHub GraphQL API (zero dependencies, Node >= 18).

const API = 'https://api.github.com/graphql';

async function gql(query, variables, token) {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      Authorization: `bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'profile-readme-generator',
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join('; '));
  return json.data;
}

const REPOS_QUERY = `
query ($login: String!, $after: String) {
  user(login: $login) {
    contributionsCollection { contributionYears }
    repositories(first: 100, after: $after, ownerAffiliations: OWNER, privacy: PUBLIC, isFork: false) {
      totalCount
      pageInfo { hasNextPage endCursor }
      nodes {
        name
        stargazerCount
        languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
          edges { size node { name color } }
        }
      }
    }
  }
}`;

function commitsQuery(years) {
  const fields = years
    .map(
      (y) =>
        `y${y}: contributionsCollection(from: "${y}-01-01T00:00:00Z", to: "${y}-12-31T23:59:59Z") { totalCommitContributions }`
    )
    .join('\n    ');
  return `query ($login: String!) {\n  user(login: $login) {\n    ${fields}\n  }\n}`;
}

/**
 * @returns {Promise<{repos:number, stars:number, commits:number, sinceYear:number|null,
 *   languages:{name:string, size:number, percent:number}[]}>}
 */
export async function fetchGitHubStats({
  username,
  token,
  excludeRepos = [],
  excludeLanguages = [],
  topLanguages = 6,
}) {
  if (!token) throw new Error('Missing GITHUB_TOKEN');

  // 1) Repositories (paginated) + contribution years
  const repos = [];
  let totalCount = 0;
  let years = [];
  let after = null;
  do {
    const { user } = await gql(REPOS_QUERY, { login: username, after }, token);
    if (!user) throw new Error(`User not found: ${username}`);
    totalCount = user.repositories.totalCount;
    years = user.contributionsCollection.contributionYears;
    repos.push(...user.repositories.nodes);
    const { hasNextPage, endCursor } = user.repositories.pageInfo;
    after = hasNextPage ? endCursor : null;
  } while (after);

  const excludedRepos = new Set(excludeRepos.map((r) => r.toLowerCase()));
  const counted = repos.filter((r) => !excludedRepos.has(r.name.toLowerCase()));

  // 2) Stars
  const stars = counted.reduce((sum, r) => sum + r.stargazerCount, 0);

  // 3) Languages (aggregated by bytes)
  const excludedLangs = new Set(excludeLanguages.map((l) => l.toLowerCase()));
  const sizes = new Map();
  for (const repo of counted) {
    for (const { size, node } of repo.languages.edges) {
      if (excludedLangs.has(node.name.toLowerCase())) continue;
      sizes.set(node.name, (sizes.get(node.name) || 0) + size);
    }
  }
  const top = [...sizes.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topLanguages)
    .map(([name, size]) => ({ name, size }));
  const topTotal = top.reduce((s, l) => s + l.size, 0) || 1;
  const languages = top.map((l) => ({ ...l, percent: (l.size / topTotal) * 100 }));

  // 4) Commits across every contribution year (public commits visible to the token)
  let commits = 0;
  if (years.length) {
    const { user } = await gql(commitsQuery(years), { login: username }, token);
    commits = Object.values(user).reduce((s, c) => s + c.totalCommitContributions, 0);
  }

  return {
    repos: totalCount,
    stars,
    commits,
    sinceYear: years.length ? Math.min(...years) : null,
    languages,
  };
}
