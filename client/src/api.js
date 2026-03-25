.full-col {
  grid-column: 1 / -1;
}

.summary-row {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.summary-pill {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 16px;
  background: var(--panelSoft);
  border: 1px solid var(--line);
}

.upload-box {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.upload-box input[type="file"] {
  background: var(--panelSoft);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 12px;
  color: var(--text);
}
