import { useState } from "preact/hooks";
import { groupRegions, type RegionGroup } from "./region-grouping";
import type { Report } from "./report";
import "./region-tree.css";

type RegionTreeProps = {
    reports: Report[];
    onSelectReport?: (region: string | null) => void;
};

export function RegionTree({ reports, onSelectReport }: RegionTreeProps) {
    const tree = groupRegions(reports);

    return (
        <div className="region-tree">
            {tree.map((continent: RegionGroup) => (
                <ContinentGroup
                    key={continent.name}
                    group={continent}
                    onSelectReport={onSelectReport}
                />
            ))}
        </div>
    );
}

type GroupProps = {
    group: RegionGroup;
    onSelectReport?: (region: string | null) => void;
};

function ContinentGroup({ group, onSelectReport }: GroupProps) {
    const [open, setOpen] = useState(true);
    const feedCount = group.children.reduce((sum: number, c: RegionGroup) => sum + c.children.length, 0);

    return (
        <div className="region-tree-continent">
            <div className="region-tree-header" onClick={() => setOpen(!open)}>
                <span className={`region-tree-arrow ${open ? 'open' : ''}`}>▶</span>
                <span>{group.name}</span>
                <span className="region-tree-count">({feedCount} feeds)</span>
            </div>
            {open && group.children.map((country: RegionGroup) => (
                <CountryGroup
                    key={country.name}
                    group={country}
                    onSelectReport={onSelectReport}
                />
            ))}
        </div>
    );
}

function CountryGroup({ group, onSelectReport }: GroupProps) {
    const [open, setOpen] = useState(false);

    return (
        <div className="region-tree-country">
            <div className="region-tree-header" onClick={() => setOpen(!open)}>
                <span className={`region-tree-arrow ${open ? 'open' : ''}`}>▶</span>
                <span>{group.name}</span>
                <span className="region-tree-count">({group.children.length} feeds)</span>
            </div>
            {open && (
                <div className="region-tree-feeds">
                    <table className="report-table">
                        <thead>
                            <tr>
                                <th>Region</th>
                                <th>Live Updates</th>
                                <th>GTFS Date</th>
                                <th>Matched</th>
                                <th>Empty</th>
                                <th>No Match</th>
                            </tr>
                        </thead>
                        <tbody>
                            {group.children.map((feed: RegionGroup) => (
                                <FeedRow
                                    key={feed.name}
                                    group={feed}
                                    onSelectReport={onSelectReport}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

const dateFormatter = new Intl.DateTimeFormat(navigator.language, { year: 'numeric', month: 'short', day: 'numeric' });

function formatDate(date: Date | null | undefined) {
    return date ? dateFormatter.format(date) : 'N/A';
}

function daysSince(date: Date) {
    return Math.ceil((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function FeedRow({ group, onSelectReport }: GroupProps) {
    const report = group.reports[0];
    const matchStats = report?.matchStats;
    const matched = matchStats && (matchStats.matchId + matchStats.nameMatch + matchStats.manyToOne + matchStats.transitHubs);
    const matchPercent = matched && matchStats ? matched / matchStats.total * 100 : undefined;

    const gtfsDate = report?.matchMeta?.gtfsTimeStamp
        ? new Date(report.matchMeta.gtfsTimeStamp)
        : null;
    const days = gtfsDate ? daysSince(gtfsDate) : null;

    let matchClass = '';
    if (matchPercent) {
        if (matchPercent >= 85) matchClass = 'hl-green';
        else if (matchPercent >= 75) matchClass = 'hl-yellow';
        else matchClass = 'hl-red';
    }

    let daysClass = '';
    if (days !== null) {
        if (days <= 14) daysClass = 'hl-green';
        else if (days <= 45) daysClass = 'hl-yellow';
        else daysClass = 'hl-red';
    }

    return (
        <tr>
            <td>
                <a
                    href={`#/match-report/${group.name}`}
                    onClick={() => onSelectReport?.(group.name)}
                >
                    {group.name}
                </a>
            </td>
            <td>{report?.liveUpdates ? 'Yes' : 'No'}</td>
            <td className={daysClass}>
                {formatDate(gtfsDate)}
                {days !== null && days > 0 && <span> ({days} days)</span>}
            </td>
            <td className={matchClass}>
                {matchPercent !== undefined
                    ? `${matchPercent.toFixed(0)}% (${matched} of ${matchStats!.total})`
                    : '-'}
            </td>
            <td>{matchStats?.empty || '-'}</td>
            <td>{matchStats?.noMatch || '-'}</td>
        </tr>
    );
}