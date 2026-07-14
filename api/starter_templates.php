<?php
/**
 * Single source of truth for the starter workspace content given to every
 * new student account. Shared by users.php (seeding) and, on the frontend,
 * mirrored in src/sandbox/preamble.js so docs and behaviour stay in sync.
 */

/**
 * Returns the fixed, read-only JSX preamble shown above the student editor.
 * Imports are stripped before compilation; this is shown for idiom only.
 *
 * @return string
 */
function starter_preamble(): string
{
    return <<<'JSX'
/**
 * DataDisplay.jsx
 * Your component. Fetch FPL data with axios and render it below.
 */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from './config';

JSX;
}

/**
 * Returns the starter JSX body a new student begins with.
 *
 * @return string
 */
function starter_jsx(): string
{
    return <<<'JSX'
export default function DataDisplay() {
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
JSX;
}

/**
 * Returns the starter CSS a new student begins with.
 *
 * @return string
 */
function starter_css(): string
{
    return <<<'CSS'
ul {
  list-style: none;
  padding: 0;
}

li {
  padding: 0.25rem 0;
}
CSS;
}
