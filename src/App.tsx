import { Routes, Route } from 'react-router-dom';
import './App.css';
import RunsPane from './components/RunsPane';
import StepsPane from './components/StepsPane';

function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<RunsPane />} />
      <Route path="/runs/:runId" element={<StepsPane />} />
    </Routes>
  );
}

export default App;
