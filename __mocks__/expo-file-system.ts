class MockDirectory {
  uri: string;
  constructor(uri: string) {
    this.uri = uri;
  }
}

export class File {
  uri: string;
  constructor(...args: (string | MockDirectory)[]) {
    const parts = args.map((a) => (typeof a === 'string' ? a : a.uri));
    this.uri = parts.join('');
  }
  write = jest.fn();
  move = jest.fn();
  delete = jest.fn();
}

export class Directory extends MockDirectory {}

export const Paths = {
  cache: new MockDirectory('/tmp/'),
  document: new MockDirectory('/tmp/'),
};
