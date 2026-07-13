import { describe, expect, test } from "bun:test";
import { parseJobCards, parseJobDetail, decodeHtmlEntities } from "../src/helpers";

function searchCard(id: string, title: string, company: string, cities: string[]): string {
  const spans = cities.map((c, i) => (i < cities.length - 1 ? `<span>${c}<!-- -->, </span>` : `<span>${c}</span>`)).join("");
  return `<li><article data-testid="job-search-result" aria-label="${title}"><a href="/jobs/slug-${id}" aria-label="${title}" target="_blank" class="card-styles__CardLink"></a><div><h2 data-xds="Headline" data-testid="job-teaser-list-title">${title}</h2><p data-xds="BodyCopy">${company}</p><div class="multi-location-display-styles__Container"><p data-xds="BodyCopy">${spans}<b class="multi-location-display-styles__OverflowLabel">+ 0 weitere</b></p></div><div class="job-teaser-facts__MarkerContainer"><span class="marker-styles__Text">Vollzeit</span><span class="marker-styles__Text">62.000 € – 85.000 €</span></div><p data-testid="job-details-published-date"><time dateTime="2026-07-03T16:07:48Z"></time></p></div></article></li>`;
}

describe("parseJobCards", () => {
  test("extracts id, title, company, location, date from a card", () => {
    const html = searchCard("156013338", "Software Engineer C++", "FindYou Consulting GmbH", ["München", "Berlin"]);
    const cards = parseJobCards(html);
    expect(cards).toHaveLength(1);
    expect(cards[0].id).toBe("156013338");
    expect(cards[0].title).toBe("Software Engineer C++");
    expect(cards[0].company).toBe("FindYou Consulting GmbH");
    expect(cards[0].location).toBe("München, Berlin");
    expect(cards[0].url).toBe("https://www.xing.com/jobs/slug-156013338");
  });

  test("multiple cards in one page are all parsed independently", () => {
    const html = searchCard("100000001", "Job A", "Company A", ["Berlin"]) + searchCard("100000002", "Job B", "Company B", ["München"]);
    const cards = parseJobCards(html);
    expect(cards).toHaveLength(2);
    expect(cards.map((c) => c.id)).toEqual(["100000001", "100000002"]);
  });

  test("a malformed card (no href) is skipped without breaking others", () => {
    const bad = `<li><article data-testid="job-search-result"><h2 data-testid="job-teaser-list-title">No Link</h2></article></li>`;
    const good = searchCard("100000003", "Job C", "Company C", ["Hamburg"]);
    const cards = parseJobCards(bad + good);
    expect(cards).toHaveLength(1);
    expect(cards[0].id).toBe("100000003");
  });
});

describe("parseJobDetail", () => {
  test("extracts title, company, location (from <title>), date, description", () => {
    const html = `<title>Software Engineer C++ in München, Berlin | XING Jobs</title>
      <meta data-ch name="description" content="Bewirb Dich als 'Software Engineer C++' bei FindYou. Branche: IT / Beschäftigungsart: Vollzeit / Karriere-Stufe: Mit Berufserfahrung / Veröffentlicht am: 3. Juli 2026"/>
      <div data-testid="job-details-title"><h1>Software Engineer C++</h1></div>
      <p data-testid="job-details-company-info-name">FindYou Consulting GmbH</p>
      <p data-testid="job-details-published-date"><time dateTime="2026-07-03T16:07:48Z"></time></p>
      <div data-testid="expandable-content"><section><p>We build things.</p></section></div>`;
    const job = parseJobDetail(html, "156013338", "https://www.xing.com/jobs/slug-156013338");
    expect(job.title).toBe("Software Engineer C++");
    expect(job.company).toBe("FindYou Consulting GmbH");
    expect(job.location).toBe("München, Berlin");
    expect(job.date).toBe("2026-07-03T16:07:48Z");
    expect(job.employmentType).toBe("Vollzeit");
    expect(job.seniority).toBe("Mit Berufserfahrung");
    expect(job.applyUrl).toBeNull();
  });
});

describe("decodeHtmlEntities", () => {
  test("decodes named and numeric entities", () => {
    expect(decodeHtmlEntities("M&#252;nchen")).toBe("München");
    expect(decodeHtmlEntities("C&#x27;est")).toBe("C'est");
    expect(decodeHtmlEntities("A&amp;B")).toBe("A&B");
  });
});
