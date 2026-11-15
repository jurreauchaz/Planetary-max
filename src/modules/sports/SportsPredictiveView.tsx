import React from 'react';
import LiveOddsTicker from './LiveOddsTicker';
import KinematicMotionFeed from './KinematicMotionFeed';
import BettorHudSimulator from './BettorHudSimulator';
export default function SportsPredictiveView(){return <div className="module-view"><div className="module-heading"><div><span className="eyebrow">03 / MAX-SPORTS · PREDICTIVE DOMAIN</span><h1>Stay ahead of <em>the game.</em></h1><p>Where movement, data, and instinct meet.</p></div><span className="outline-pill">↗ &nbsp; PREDICTIVE SUITE</span></div><LiveOddsTicker/><div className="sports-layout"><KinematicMotionFeed/><BettorHudSimulator/></div></div>}
