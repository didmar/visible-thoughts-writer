import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getSteps, Step } from '../firebase-app';
import StepElem from './StepElem';

function StepsPane(): JSX.Element {
  const { runId } = useParams();

  const [steps, setSteps] = useState<Step[]>([]);

  useEffect(() => {
    void (async function () {
      if (runId !== undefined) {
        setSteps(await getSteps(runId));
      }
    })();
  }, [runId]);

  return (
    <div className="StepsPane">
      <>
        <h1>Steps for {runId?.toString()}</h1>
        {steps.map((step) => (
          <StepElem key={step.id} step={step} />
        ))}
      </>
    </div>
  );
}

export default StepsPane;
