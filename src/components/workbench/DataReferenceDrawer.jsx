/**
 * Reference documentation for the shape of the four whitelisted FPL
 * endpoints, so students know what fields exist before they write code
 * against them. Static content; no network calls of its own (use the
 * API explorer for that).
 */

const SECTIONS = [
  {
    title: 'Teams',
    source: "endpoint=bootstrap-static → response.data.teams",
    description: 'One row per Premier League club.',
    fields: [
      ['id', 'number, used to match a player to their club'],
      ['name', 'full club name, e.g. "Arsenal"'],
      ['short_name', 'three-letter code, e.g. "ARS"'],
      ['strength', 'overall club strength rating (1-5)'],
      ['played', 'matches played so far'],
      ['win / draw / loss', 'results so far'],
      ['points', 'league points'],
    ],
  },
  {
    title: 'Players (elements)',
    source: 'endpoint=bootstrap-static → response.data.elements',
    description: 'One row per player in the game. This is the big list most projects start from.',
    fields: [
      ['id', 'number, used with element-summary to get one player’s detail'],
      ['first_name / second_name / web_name', 'web_name is the short name shown on the real FPL site'],
      ['team', 'matches a team’s id from the teams list'],
      ['element_type', 'matches an id in element_types (their position)'],
      ['now_cost', 'price in tenths of a million, e.g. 125 means £12.5m'],
      ['total_points', 'FPL points scored this season'],
      ['form', 'average points over recent gameweeks, as a string'],
      ['selected_by_percent', 'percentage of FPL managers who own this player, as a string'],
      ['minutes / goals_scored / assists / clean_sheets', 'season totals'],
    ],
  },
  {
    title: 'Positions (element_types)',
    source: 'endpoint=bootstrap-static → response.data.element_types',
    description: 'The four playing positions.',
    fields: [
      ['id', 'matches a player’s element_type'],
      ['singular_name', '"Goalkeeper", "Defender", "Midfielder", "Forward"'],
      ['singular_name_short', '"GKP", "DEF", "MID", "FWD"'],
    ],
  },
  {
    title: 'Gameweeks (events)',
    source: 'endpoint=bootstrap-static → response.data.events',
    description: 'The 38 gameweeks of the season.',
    fields: [
      ['id', 'gameweek number, 1 to 38 — this is the gw you pass to event-live'],
      ['name', '"Gameweek 12"'],
      ['deadline_time', 'ISO date string'],
      ['finished', 'true once every match in the gameweek is done'],
      ['is_current / is_next', 'at most one gameweek has each of these true'],
      ['average_entry_score / highest_score', 'once finished'],
    ],
  },
  {
    title: 'Fixtures',
    source: 'endpoint=fixtures → response.data (a plain array)',
    description: 'Every match in the season, past and future.',
    fields: [
      ['id', 'fixture id'],
      ['event', 'which gameweek this fixture belongs to'],
      ['team_h / team_a', 'home and away team ids, matching the teams list'],
      ['team_h_score / team_a_score', 'null until the match is played'],
      ['kickoff_time', 'ISO date string'],
      ['finished', 'true once the match has been played'],
    ],
  },
  {
    title: 'One player in detail (element-summary)',
    source: 'endpoint=element-summary&id=N → response.data',
    description: 'Everything about a single player, found by their id from the elements list.',
    fields: [
      ['history', 'array, one entry per gameweek played this season (points, minutes, goals, etc. for that gameweek)'],
      ['history_past', 'array, one entry per previous season'],
      ['fixtures', 'array of this player’s upcoming fixtures'],
    ],
  },
  {
    title: 'Live gameweek scores (event-live)',
    source: 'endpoint=event-live&gw=N → response.data.elements',
    description: 'Live-updating stats for every player during gameweek N (1-38).',
    fields: [
      ['id', 'matches a player’s id from the elements list'],
      ['stats.minutes / goals_scored / assists / clean_sheets', 'this gameweek only'],
      ['stats.bonus', 'bonus points awarded this gameweek'],
      ['stats.total_points', 'this player’s FPL points for this gameweek'],
    ],
  },
];

/**
 * @param {{ open: boolean, onClose: () => void }} props
 */
export default function DataReferenceDrawer({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="side-drawer side-drawer-left">
      <div className="side-drawer-header">
        <span>FPL data reference</span>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="side-drawer-body">
        <p className="side-drawer-intro">
          What each endpoint gives you. Field names are exactly what comes back in the JSON, so
          you can use them directly, e.g. <code>player.web_name</code> or{' '}
          <code>team.short_name</code>. Use the API explorer tab to see real data for any of
          these.
        </p>
        {SECTIONS.map((section) => (
          <details key={section.title} className="reference-section">
            <summary>{section.title}</summary>
            <p className="reference-source">{section.source}</p>
            <p className="reference-description">{section.description}</p>
            <table className="reference-fields">
              <tbody>
                {section.fields.map(([field, note]) => (
                  <tr key={field}>
                    <td>
                      <code>{field}</code>
                    </td>
                    <td>{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        ))}

        <div className="reference-external">
          <p className="reference-description">
            The Premier League doesn't publish official documentation for this API. These
            community-written guides cover the same endpoints in more depth, if you want to dig
            further:
          </p>
          <ul className="reference-external-links">
            <li>
              <a href="https://www.oliverlooney.com/blogs/FPL-APIs-Explained" target="_blank" rel="noopener noreferrer">
                FPL APIs Explained (Oliver Looney)
              </a>
            </li>
            <li>
              <a
                href="https://medium.com/@frenzelts/fantasy-premier-league-api-endpoints-a-detailed-guide-acbd5598eb19"
                target="_blank"
                rel="noopener noreferrer"
              >
                Fantasy Premier League API Endpoints: A Detailed Guide (Medium)
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
