// Static data for the intake -> sourcing -> ranked slate flow. Swap for API calls later.
export const parsedJD = {
  title: 'Senior Data Engineer',
  required: ['Python', 'SQL', 'Spark', 'Airflow', 'AWS', 'dbt', 'Kafka', 'Data modeling'],
  preferred: ['Snowflake', 'Terraform'],
  years: 7, seniority: 'Senior', location: 'Orlando, FL 32835', mode: 'Hybrid',
  contract: 'W2, 12 months',
  assumptions: 'Education treated as preferred, not required. No salary range in the JD, so none was assumed.',
};
export const stages = ['Parsing job description', 'Planning queries', 'Searching GitHub', 'Searching Stack Overflow', 'Removing duplicates', 'Scoring candidates', 'Looking up contacts'];
export const contactLabels = { verified_source: 'Verified source', reported: 'Reported', probable: 'Probable', unverified: 'Unverified', not_found: 'Not found' };
export const scoreColors = { skills: '#2dd4bf', title: '#3b82f6', commute: '#f59e0b', experience: '#a855f7', certs: '#5b6b7a' };

const mk = (id, name, title, source, url, location, miles, mins, b, matched, missing, why, label, value, flags = []) => ({
  id, name, title, source, url, location, miles, mins, b, matched, missing, why, label, value, flags,
  score: Object.values(b).reduce((a, x) => a + x, 0), status: 'new', shortlisted: false, notes: '',
});
export const slate = [
  mk('s1', 'Naresh Iyer', 'Senior Data Engineer', 'GitHub', 'https://github.com/example-naresh', 'Orlando, FL', 9.4, 22, { skills: 34, title: 20, commute: 18, experience: 15, certs: 5 }, ['Python', 'SQL', 'Spark', 'Airflow', 'AWS', 'dbt'], ['Kafka'], 'Strong match on 6 of 8 required skills and a near-identical title. Short commute.', 'verified_source', 'naresh@example.com'),
  mk('s2', 'Priya Nair', 'Lead Data Engineer', 'Stack Overflow', 'https://stackoverflow.com/users/000001/priya', 'Winter Park, FL', 25.0, 51, { skills: 31, title: 18, commute: 11, experience: 15, certs: 5 }, ['Python', 'SQL', 'Spark', 'Kafka', 'AWS'], ['dbt', 'Airflow'], 'Good skills fit and a Lead title. Commute is long at peak hours.', 'probable', 'priya.nair@example.org'),
  mk('s3', 'Marcus Webb', 'Data Platform Engineer', 'GitHub', 'https://github.com/example-marcus', 'Lakeland, FL', 36.7, 67, { skills: 29, title: 14, commute: 6, experience: 13, certs: 5 }, ['Python', 'SQL', 'Airflow', 'Terraform'], ['Spark', 'dbt', 'Kafka'], 'Platform background with strong Airflow work. Long commute and 3 gaps.', 'unverified', 'marcus@example.dev'),
  mk('s4', 'Elena Rossi', 'Senior Analytics Engineer', 'GitHub', 'https://github.com/example-elena', 'Kissimmee, FL', 17.8, 40, { skills: 26, title: 12, commute: 13, experience: 12, certs: 5 }, ['SQL', 'dbt', 'Snowflake', 'Python'], ['Spark', 'Kafka', 'AWS'], 'Analytics-leaning. Strong dbt and SQL, thin on streaming.', 'not_found', '', ['Identity uncertain: same name on 2 platforms']),
  mk('s5', 'Tom Alvarez', 'Data Engineer', 'Stack Overflow', 'https://stackoverflow.com/users/000002/tom', 'Sanford, FL', 28.3, 55, { skills: 22, title: 10, commute: 9, experience: 8, certs: 5 }, ['Python', 'SQL', 'AWS'], ['Spark', 'Airflow', 'dbt', 'Kafka'], 'Mid-level profile. Years of experience are unclear, so scored neutrally.', 'reported', '+1 407 555 0142'),
  mk('s6', 'Aisha Khan', 'Staff Data Engineer', 'GitHub', 'https://github.com/example-aisha', 'Orlando, FL', 12.1, 28, { skills: 35, title: 20, commute: 17, experience: 15, certs: 5 }, ['Python', 'SQL', 'Spark', 'Airflow', 'AWS', 'dbt', 'Kafka'], [], 'Covers every required skill with a Staff title. Best overall match.', 'verified_source', 'aisha@example.io'),
].sort((a, b) => b.score - a.score);
