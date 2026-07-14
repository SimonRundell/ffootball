/**
 * Starter JSX/CSS shown to a student before their first save loads real
 * data. Mirrors api/starter_templates.php's starter_jsx()/starter_css(),
 * which is what actually seeds a new account's workspace row.
 */

export const STARTER_JSX = `export default function DataDisplay() {
  const [players, setPlayers] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get('fpl.php?endpoint=bootstrap-static')
      .then((res) => setPlayers(res.data.teams))
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return <p>Something went wrong: {error}</p>;
  }

  if (!players) {
    return <p>Loading teams...</p>;
  }

  return (
    <ul>
      {players.map((team) => (
        <li key={team.id}>{team.name}</li>
      ))}
    </ul>
  );
}
`;

export const STARTER_CSS = `ul {
  list-style: none;
  padding: 0;
}

li {
  padding: 0.25rem 0;
}
`;
