import type { Report } from "./report";

export interface RegionGroup {
    name: string;
    level: 'continent' | 'country' | 'feed';
    reports: Report[];
    children: RegionGroup[];
}

const REGION_META: Record<string, [string, string]> = {
    'argentina': ['Argentina', 'South America'],
    'australia': ['Australia', 'Oceania'],
    'belgia': ['Belgium', 'Europe'],
    'boston': ['USA', 'North America'],
    'calgary': ['Canada', 'North America'],
    'canada': ['Canada', 'North America'],
    'chicago': ['USA', 'North America'],
    'czech': ['Czech Republic', 'Europe'],
    'detroit': ['USA', 'North America'],
    'dublinbus': ['Ireland', 'Europe'],
    'edmonton': ['Canada', 'North America'],
    'england': ['United Kingdom', 'Europe'],
    'espania': ['Spain', 'Europe'],
    'estonia': ['Estonia', 'Europe'],
    'france': ['France', 'Europe'],
    'fredricton': ['Canada', 'North America'],
    'germany': ['Germany', 'Europe'],
    'grande': ['Canada', 'North America'],
    'greater': ['USA', 'North America'],
    'halifax': ['Canada', 'North America'],
    'italy': ['Italy', 'Europe'],
    'krakow': ['Poland', 'Europe'],
    'lithuania': ['Lithuania', 'Europe'],
    'luxemburg': ['Luxembourg', 'Europe'],
    'malaysia': ['Malaysia', 'Asia'],
    'maryland': ['USA', 'North America'],
    'moncton': ['Canada', 'North America'],
    'montreal': ['Canada', 'North America'],
    'mta': ['USA', 'North America'],
    'netherlands': ['Netherlands', 'Europe'],
    'ottawa': ['Canada', 'North America'],
    'philadelphia': ['USA', 'North America'],
    'poland': ['Poland', 'Europe'],
    'portland': ['USA', 'North America'],
    'portugal': ['Portugal', 'Europe'],
    'quebec': ['Canada', 'North America'],
    'riga': ['Latvia', 'Europe'],
    'saint': ['Canada', 'North America'],
    'seattle': ['USA', 'North America'],
    'serbia': ['Serbia', 'Europe'],
    'singapore': ['Singapore', 'Asia'],
    'spain': ['Spain', 'Europe'],
    'sweden': ['Sweden', 'Europe'],
    'swiss': ['Switzerland', 'Europe'],
    'toronto': ['Canada', 'North America'],
    'uk': ['United Kingdom', 'Europe'],
    'us': ['USA', 'North America'],
    'vancouver': ['Canada', 'North America'],
    'vilnus': ['Lithuania', 'Europe'],
    'winnipeg': ['Canada', 'North America'],
    'wroclaw': ['Poland', 'Europe'],
};

function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

export function inferCountry(region: string): string {
    const prefix = region.split('-')[0];
    return REGION_META[prefix]?.[0] ?? capitalize(prefix);
}

export function inferContinent(region: string): string {
    const prefix = region.split('-')[0];
    return REGION_META[prefix]?.[1] ?? 'Other';
}

function findOrCreate(groups: RegionGroup[], name: string, level: RegionGroup['level']): RegionGroup {
    let group = groups.find(g => g.name === name);
    if (!group) {
        group = { name, level, reports: [], children: [] };
        groups.push(group);
    }
    return group;
}

export function groupRegions(reports: Report[]): RegionGroup[] {
    const tree: RegionGroup[] = [];

    for (const report of reports) {
        const continent = (report as any).continent ?? inferContinent(report.region);
        const country = (report as any).country ?? inferCountry(report.region);

        const continentGroup = findOrCreate(tree, continent, 'continent');
        const countryGroup = findOrCreate(continentGroup.children, country, 'country');
        countryGroup.children.push({
            name: report.region,
            level: 'feed',
            reports: [report],
            children: []
        });
    }

    tree.sort((a, b) => a.name.localeCompare(b.name));
    tree.forEach(continent => {
        continent.children.sort((a, b) => a.name.localeCompare(b.name));
    });

    const otherIndex = tree.findIndex(g => g.name === 'Other');
    if (otherIndex > -1) {
        tree.push(tree.splice(otherIndex, 1)[0]);
    }

    return tree;
}
