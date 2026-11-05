/*
 * XV NATION — GLOBAL RANKINGS
 *
 * Ranking data: data/teams.json
 * Club metadata: teams_meta.csv
 * Logo images: assets/logos/
 *
 * teams_meta.csv is the authoritative source for club logos
 * and supplementary club information.
 */

(async function () {
    "use strict";

    const $ = id => document.getElementById(id);

    const rows = $("rankingRows");
    const count = $("count");
    const league = $("league");

    if (!rows || !count || !league) {
        console.error("XVN: Required rankings HTML elements are missing.");
        return;
    }

    // ---------------------------------------
    // CSV PARSER
    // ---------------------------------------

    function parseCSV(text) {
        const records = [];
        let row = [];
        let field = "";
        let quoted = false;

        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            const next = text[i + 1];

            if (quoted) {
                if (ch === '"' && next === '"') {
                    field += '"';
                    i++;
                } else if (ch === '"') {
                    quoted = false;
                } else {
                    field += ch;
                }
            } else {
                if (ch === '"') {
                    quoted = true;
                } else if (ch === ",") {
                    row.push(field);
                    field = "";
                } else if (ch === "\n") {
                    row.push(field.replace(/\r$/, ""));

                    if (row.some(v => v.trim() !== "")) {
                        records.push(row);
                    }

                    row = [];
                    field = "";
                } else {
                    field += ch;
                }
            }
        }

        row.push(field.replace(/\r$/, ""));

        if (row.some(v => v.trim() !== "")) {
            records.push(row);
        }

        if (!records.length) return [];

        const headers = records.shift().map(h => h.trim());

        return records.map(values => {
            const item = {};

            headers.forEach((header, index) => {
                item[header] = (values[index] || "").trim();
            });

            return item;
        });
    }

    // ---------------------------------------
    // LOGO PATH HANDLING
    // ---------------------------------------

    function normaliseLogoPath(value) {
        if (!value) return "";

        let path = value.trim().replace(/\\/g, "/");

        path = path.replace(/^\.\/+/, "");

        // Remove duplicated logo folder prefixes.
        while (path.startsWith("assets/logos/assets/logos/")) {
            path = path.substring("assets/logos/".length);
        }

        // Preserve complete URLs.
        if (/^(https?:)?\/\//i.test(path)) {
            return path;
        }

        // Remove leading slash.
        path = path.replace(/^\/+/, "");

        // Add the folder only when it is missing.
        if (!path.startsWith("assets/logos/")) {
            path = "assets/logos/" + path;
        }

        return path;
    }

    // ---------------------------------------
    // HTML SAFETY
    // ---------------------------------------

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]);
    }

    // ---------------------------------------
    // LOAD RANKINGS AND TEAM METADATA
    // ---------------------------------------

    try {
        const [teamsResponse, metadataResponse] = await Promise.all([
            fetch("data/teams.json"),
            fetch("teams_meta.csv")
        ]);

        if (!teamsResponse.ok) {
            throw new Error("Could not load data/teams.json");
        }

        if (!metadataResponse.ok) {
            throw new Error("Could not load teams_meta.csv");
        }

        const teams = await teamsResponse.json();

        const metadata = parseCSV(
            await metadataResponse.text()
        );

        // Match CSV records to teams using team_id.
        const metadataById = new Map(
            metadata.map(item => [
                item.team_id,
                item
            ])
        );

        // Apply metadata to ranking records.
        teams.forEach(team => {
            const meta = metadataById.get(team.team_id);

            if (meta) {
                team.logo = normaliseLogoPath(
                    meta.logo || team.logo
                );

                team.city = meta.city || team.city;
                team.country = meta.country || team.country;
                team.stadium = meta.stadium || team.stadium;
                team.website = meta.website || team.website;
                team.instagram = meta.instagram || team.instagram;
                team.facebook = meta.facebook || team.facebook;
                team.x = meta.x || team.x;
                team.youtube = meta.youtube || team.youtube;

                team.league = meta.league_id || team.league;
            } else {
                team.logo = normaliseLogoPath(team.logo);
            }
        });

        // ---------------------------------------
        // POPULATE LEAGUE FILTER
        // ---------------------------------------

        const leagues = [
            ...new Set(
                teams.map(team => team.league).filter(Boolean)
            )
        ].sort();

        leagues.forEach(value => {
            const option = document.createElement("option");

            option.value = value;
            option.textContent = value;

            league.appendChild(option);
        });

        // ---------------------------------------
        // DRAW RANKINGS
        // ---------------------------------------

        function draw() {
            const query = $("q").value.toLowerCase().trim();
            const country = $("country").value;
            const selectedLeague = league.value;
            const sort = $("sort").value;

            let filtered = teams.filter(team => {
                const searchable = [
                    team.name,
                    team.city,
                    team.country,
                    team.league
                ].join(" ").toLowerCase();

                return (
                    (!query || searchable.includes(query)) &&
                    (!country || team.country === country) &&
                    (!selectedLeague || team.league === selectedLeague)
                );
            });

            // Sorting options.
            filtered.sort((a, b) => {
                if (sort === "rating") {
                    return b.global_rating - a.global_rating;
                }

                if (sort === "wins") {
                    return b.won - a.won;
                }

                if (sort === "played") {
                    return b.played - a.played;
                }

                return a.rank - b.rank;
            });

            // Generate ranking rows.
            rows.innerHTML = filtered.map(team => {
                const logo = normaliseLogoPath(team.logo);

                const initials = escapeHTML(
                    team.name.slice(0, 2).toUpperCase()
                );

                const logoHTML = logo
                    ? `
                        <img
                            src="${escapeHTML(logo)}"
                            alt="${escapeHTML(team.name)} badge"
                            onerror="
                                this.style.display='none';
                                this.nextElementSibling.style.display='inline-flex';
                            "
                        >
                        <span
                            class="badge-fallback"
                            style="display:none"
                        >${initials}</span>
                    `
                    : `
                        <span class="badge-fallback">
                            ${initials}
                        </span>
                    `;

                const formHTML = (team.form || "")
                    .slice(-5)
                    .split("")
                    .map(result =>
                        `<i class="${escapeHTML(result)}"></i>`
                    )
                    .join("");

                return `
                    <tr>
                        <td class="rank">
                            ${escapeHTML(team.rank)}
                        </td>

                        <td>
                            <a
                                class="teamcell"
                                href="clubs/${escapeHTML(team.slug)}.html"
                            >
                                <span class="badge">
                                    ${logoHTML}
                                </span>

                                ${escapeHTML(team.name)}
                            </a>
                        </td>

                        <td>${escapeHTML(team.league)}</td>

                        <td>${escapeHTML(team.city)}</td>

                        <td>${escapeHTML(team.played)}</td>

                        <td>${escapeHTML(team.won)}</td>

                        <td>${escapeHTML(team.drawn)}</td>

                        <td>${escapeHTML(team.lost)}</td>

                        <td>
                            <span class="form">
                                ${formHTML}
                            </span>
                        </td>

                        <td>
                            <strong>
                                ${Number(team.global_rating).toFixed(1)}
                            </strong>
                        </td>
                    </tr>
                `;
            }).join("");

            count.textContent =
                `Showing ${filtered.length} of ${teams.length} clubs`;
        }

        // ---------------------------------------
        // FILTER EVENT LISTENERS
        // ---------------------------------------

        ["q", "country", "league", "sort"].forEach(id => {
            const element = $(id);

            if (element) {
                element.addEventListener(
                    id === "q" ? "input" : "change",
                    draw
                );
            }
        });

        draw();

        console.log(
            `XV Nation rankings loaded: ${teams.length} clubs`
        );

    } catch (error) {
        console.error("XV Nation rankings error:", error);

        rows.innerHTML = `
            <tr>
                <td colspan="10">
                    Rankings could not load.
                    Check that data/teams.json,
                    teams_meta.csv and assets/rankings.js
                    are in the correct locations.
                </td>
            </tr>
        `;

        count.textContent = error.message;
    }

})();
