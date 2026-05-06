import React from "react";
import "./ui-system.css";

export function UiButton({ variant = "secondary", className = "", type = "button", ...props }) {
  return <button type={type} className={`btn ${variant} ${className}`.trim()} {...props} />;
}

export function UiCard({ className = "", children, ...props }) {
  return <div className={`card ${className}`.trim()} {...props}>{children}</div>;
}

export function UiBadge({ tone = "default", className = "", children, ...props }) {
  return <span className={`mini-badge ${tone} ${className}`.trim()} {...props}>{children}</span>;
}

export function UiField({ label, className = "", children }) {
  return (
    <label className={className}>
      {label ? <span>{label}</span> : null}
      {children}
    </label>
  );
}

export function UiEmptyState({ children = "Ma'lumot yo'q" }) {
  return <div className="empty-block">{children}</div>;
}

export function UiTableShell({ children, className = "" }) {
  return <div className={`table-wrap ${className}`.trim()}>{children}</div>;
}

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
