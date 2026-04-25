'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useState } from 'react';
import { encodePassphrase, generateRoomId, randomString } from '@/lib/client-utils';
import styles from '../styles/Home.module.css';

function Tabs(props: React.PropsWithChildren<{}>) {
  const searchParams = useSearchParams();
  const tabIndex = searchParams?.get('tab') === 'custom' ? 1 : 0;

  const router = useRouter();
  function onTabSelected(index: number) {
    const tab = index === 1 ? 'custom' : 'demo';
    router.push(`/?tab=${tab}`);
  }

  let tabs = React.Children.map(props.children, (child, index) => {
    return (
      <button
        className={styles.tabButton}
        onClick={() => {
          if (onTabSelected) {
            onTabSelected(index);
          }
        }}
        aria-pressed={tabIndex === index}
      >
        {/* @ts-ignore */}
        {child?.props.label}
      </button>
    );
  });

  return (
    <div className={styles.tabContainer}>
      <div className={styles.tabSelect}>{tabs}</div>
      {/* @ts-ignore */}
      {props.children[tabIndex]}
    </div>
  );
}

function DemoMeetingTab(props: { label: string }) {
  const router = useRouter();
  const [e2ee, setE2ee] = useState(false);
  const [sharedPassphrase, setSharedPassphrase] = useState(randomString(64));
  const startMeeting = () => {
    if (e2ee) {
      router.push(`/rooms/${generateRoomId()}#${encodePassphrase(sharedPassphrase)}`);
    } else {
      router.push(`/rooms/${generateRoomId()}`);
    }
  };
  return (
    <div className={styles.tabContent}>
      <p className={styles.helperText}>
        Create a polished, low-latency room for focused conversations, screen sharing, chat, and
        encrypted sessions.
      </p>
      <button className={`${styles.primaryAction} lk-button`} onClick={startMeeting}>
        Start Meeting
      </button>
      <div className={styles.securityPanel}>
        <div className={styles.checkRow}>
          <input
            id="demo-use-e2ee"
            type="checkbox"
            checked={e2ee}
            onChange={(ev) => setE2ee(ev.target.checked)}
          ></input>
          <label htmlFor="demo-use-e2ee">Enable end-to-end encryption</label>
        </div>
        {e2ee && (
          <div className={styles.fieldRow}>
            <label htmlFor="demo-passphrase">Passphrase</label>
            <input
              id="demo-passphrase"
              type="password"
              value={sharedPassphrase}
              onChange={(ev) => setSharedPassphrase(ev.target.value)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function CustomConnectionTab(props: { label: string }) {
  const router = useRouter();

  const [e2ee, setE2ee] = useState(false);
  const [sharedPassphrase, setSharedPassphrase] = useState(randomString(64));

  const onSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    const serverUrl = formData.get('serverUrl');
    const token = formData.get('token');
    if (e2ee) {
      router.push(
        `/custom/?liveKitUrl=${serverUrl}&token=${token}#${encodePassphrase(sharedPassphrase)}`,
      );
    } else {
      router.push(`/custom/?liveKitUrl=${serverUrl}&token=${token}`);
    }
  };
  return (
    <form className={styles.tabContent} onSubmit={onSubmit}>
      <p className={styles.helperText}>
        Connect LiveKit Meet with a custom server using LiveKit Cloud or LiveKit Server.
      </p>
      <div className={styles.fieldStack}>
        <label htmlFor="serverUrl">Server URL</label>
        <input
          id="serverUrl"
          name="serverUrl"
          type="url"
          placeholder="wss://*.livekit.cloud"
          required
        />
      </div>
      <div className={styles.fieldStack}>
        <label htmlFor="token">Access token</label>
        <textarea id="token" name="token" placeholder="Paste token" required rows={5} />
      </div>
      <div className={styles.securityPanel}>
        <div className={styles.checkRow}>
          <input
            id="custom-use-e2ee"
            type="checkbox"
            checked={e2ee}
            onChange={(ev) => setE2ee(ev.target.checked)}
          ></input>
          <label htmlFor="custom-use-e2ee">Enable end-to-end encryption</label>
        </div>
        {e2ee && (
          <div className={styles.fieldRow}>
            <label htmlFor="custom-passphrase">Passphrase</label>
            <input
              id="custom-passphrase"
              type="password"
              value={sharedPassphrase}
              onChange={(ev) => setSharedPassphrase(ev.target.value)}
            />
          </div>
        )}
      </div>

      <hr className={styles.divider} />
      <button className={`${styles.primaryAction} lk-button`} type="submit">
        Connect
      </button>
    </form>
  );
}

export default function Page() {
  return (
    <>
      <main className={styles.main} data-lk-theme="default">
        <section className={styles.heroShell}>
          <div className={styles.header}>
            <div className={styles.logoPlate}>
              <img src="/images/livekit-meet-home.svg" alt="LiveKit Meet" width="360" height="45" />
            </div>
            <p className={styles.eyebrow}>Modern meetings, tuned for clarity</p>
            <h1>Start a room that feels focused before anyone says hello.</h1>
            <p className={styles.lede}>
              A glassy meeting shell for fast demos, encrypted calls, custom LiveKit rooms, device
              setup, chat, recording, and polished in-call controls.
            </p>
          </div>
          <Suspense fallback={<div className={styles.loading}>Loading meeting options</div>}>
            <Tabs>
              <DemoMeetingTab label="Demo" />
              <CustomConnectionTab label="Custom" />
            </Tabs>
          </Suspense>
        </section>
      </main>
      <footer data-lk-theme="default">
        Hosted on{' '}
        <a href="https://livekit.io/cloud?ref=meet" rel="noopener">
          LiveKit Cloud
        </a>
        . Source code on{' '}
        <a href="https://github.com/livekit/meet?ref=meet" rel="noopener">
          GitHub
        </a>
        .
      </footer>
    </>
  );
}
