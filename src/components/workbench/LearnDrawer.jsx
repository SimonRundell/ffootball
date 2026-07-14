import { useState } from 'react';

/**
 * Worked examples students can copy into DataDisplay.jsx. Each is a
 * complete component body, ready to paste below the fixed preamble.
 */
const EXAMPLES = [
  {
    title: 'List every team',
    explanation: 'The starting example: fetch once, store it in state, render a list.',
    code: `export default function DataDisplay() {
  const [teams, setTeams] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get('fpl.php?endpoint=bootstrap-static')
      .then((res) => setTeams(res.data.teams))
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p>Something went wrong: {error}</p>;
  if (!teams) return <p>Loading teams...</p>;

  return (
    <ul>
      {teams.map((team) => (
        <li key={team.id}>{team.name}</li>
      ))}
    </ul>
  );
}`,
  },
  {
    title: 'Top 5 highest-scoring players',
    explanation: 'Same shape, but sort and slice the array before rendering it.',
    code: `export default function DataDisplay() {
  const [players, setPlayers] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get('fpl.php?endpoint=bootstrap-static')
      .then((res) => {
        const sorted = [...res.data.elements].sort(
          (a, b) => b.total_points - a.total_points
        );
        setPlayers(sorted.slice(0, 5));
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p>Something went wrong: {error}</p>;
  if (!players) return <p>Loading players...</p>;

  return (
    <ol>
      {players.map((player) => (
        <li key={player.id}>
          {player.web_name} — {player.total_points} points
        </li>
      ))}
    </ol>
  );
}`,
  },
  {
    title: 'One player in detail, by id',
    explanation:
      'A second axios call using a fixed id (try changing 1 to another player id from the elements list).',
    code: `export default function DataDisplay() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get('fpl.php?endpoint=element-summary&id=1')
      .then((res) => setSummary(res.data))
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p>Something went wrong: {error}</p>;
  if (!summary) return <p>Loading player...</p>;

  return (
    <div>
      <p>Gameweeks played this season: {summary.history.length}</p>
      <ul>
        {summary.history.slice(-5).map((gw) => (
          <li key={gw.round}>
            Gameweek {gw.round}: {gw.total_points} points
          </li>
        ))}
      </ul>
    </div>
  );
}`,
  },
];

/**
 * @param {{ open: boolean, onClose: () => void, onCopy?: (text: string) => void }} props
 */
export default function LearnDrawer({ open, onClose, onCopy }) {
  const [openExample, setOpenExample] = useState(0);

  if (!open) return null;

  function handleCopy(code) {
    navigator.clipboard?.writeText(code);
    onCopy?.('Example code copied to clipboard');
  }

  return (
    <div className="side-drawer side-drawer-right">
      <div className="side-drawer-header">
        <span>How to write a query</span>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="side-drawer-body">
        <p className="side-drawer-intro">Every query in DataDisplay.jsx follows the same four steps:</p>
        <ol className="learn-steps">
          <li>
            Make two pieces of state with <code>useState</code>: one for the data, one for an
            error message. Both start as <code>null</code>.
          </li>
          <li>
            Inside <code>useEffect(() =&gt; {'{ ... }'}, [])</code>, call{' '}
            <code>axios.get('fpl.php?endpoint=...')</code>. The empty <code>[]</code> means it
            only runs once, when the component first appears.
          </li>
          <li>
            On success, put the data you want into state with your setter. On failure, put the
            error message into your error state instead.
          </li>
          <li>
            While rendering: show the error if there is one, show a loading message if the data
            hasn't arrived yet, otherwise render the real thing.
          </li>
        </ol>
        <p className="side-drawer-intro">
          Worked examples below are complete, copy-ready components. Use the API explorer tab to
          see what the raw JSON looks like before you write code against it.
        </p>

        {EXAMPLES.map((example, i) => (
          <details
            key={example.title}
            className="reference-section"
            open={openExample === i}
            onToggle={(e) => e.target.open && setOpenExample(i)}
          >
            <summary>{example.title}</summary>
            <p className="reference-description">{example.explanation}</p>
            <pre className="learn-code">
              <code>{example.code}</code>
            </pre>
            <button type="button" onClick={() => handleCopy(example.code)}>
              Copy this example
            </button>
          </details>
        ))}
      </div>
    </div>
  );
}
