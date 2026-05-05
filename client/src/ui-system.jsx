import React from "react";

export function UiStatusStepper({ steps = [] }) {
  return (
    <div className="ui-status-stepper">
      {steps.map((step, index) => (
        <div key={`${step.label}-${index}`} className={`ui-status-step ${step.status || "idle"}`}>
          <div className="ui-step-marker">
            <span>{index + 1}</span>
          </div>
          <div className="ui-step-body">
            <span>{step.label}</span>
            <strong>{step.value}</strong>
            {step.detail ? <small>{step.detail}</small> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export function UiHealthStrip({ items = [] }) {
  return (
    <div className="ui-health-strip">
      {items.map((item) => (
        <div key={item.label} className={`ui-health-item ${item.tone || "default"}`}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {item.hint ? <small>{item.hint}</small> : null}
        </div>
      ))}
    </div>
  );
}

export function UiOpsTimeline({ items = [], emptyText = "Monitoring yozuvlari yo'q" }) {
  return (
    <div className="ui-ops-timeline">
      {items.length ? items.map((item, index) => (
        <div key={`${item.title}-${index}`} className={`ui-ops-row ${item.tone || "default"}`}>
          <span className="ui-ops-dot" />
          <div>
            <strong>{item.title}</strong>
            {item.text ? <small>{item.text}</small> : null}
          </div>
          {item.meta ? <em>{item.meta}</em> : null}
        </div>
      )) : <div className="empty-block">{emptyText}</div>}
    </div>
  );
}
