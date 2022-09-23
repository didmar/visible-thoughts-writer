import { Bullet, Step, Thought } from '../firebase-app';

interface StepElemProps {
  step: Step;
}

function renderThought(thought: Thought): JSX.Element {
  return <span>{thought.txt}.</span>;
}

function renderThoughts(thoughts: Thought[]): JSX.Element {
  return <>{thoughts.map((thought) => renderThought(thought))}</>;
}

function renderBullets(bullets: Bullet[]): JSX.Element {
  const b = bullets.map((bullet, index) => (
    <li key={index}>{renderThoughts(bullet.T)}</li>
  ));
  return <ul>{b}</ul>;
}

function renderYBR(ybr: boolean): JSX.Element {
  return <span>{ybr ? 'YBR!' : ''}</span>;
}

const StepElem: React.FunctionComponent<StepElemProps> = ({
  step,
}: StepElemProps) => {
  return (
    <div className="StepsPane">
      <>
        <h3>Step {step.id}</h3>
        <div>Initial thoughts: {renderBullets(step.initT)}</div>
        <div>
          Prompt: {renderYBR(step.pptYBR)} {step.ppt}
        </div>
        <div>Post-prompt thoughts: {renderBullets(step.ppptT)}</div>
        <div>
          Action: {renderYBR(step.actYBR)} {step.act}
        </div>
        <div>Post-action thoughts: {renderBullets(step.pactT)}</div>
        <div>
          Outcome: {renderYBR(step.outYBR)} {step.out}
        </div>
      </>
    </div>
  );
};

export default StepElem;
