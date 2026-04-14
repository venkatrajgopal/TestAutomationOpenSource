type ExpectedEntry = {
  text: string;
  validateSequence: boolean;
};

export function validateSequence(
  responseTexts: string[],
  expectedEntries: ExpectedEntry[]
): void {
  const sequenceEntries = expectedEntries.filter((entry) => entry.validateSequence);
  const sequenceIndices = sequenceEntries.map((entry) => responseTexts.indexOf(entry.text));

  for (let i = 1; i < sequenceIndices.length; i += 1) {
    const previousIndex = sequenceIndices[i - 1];
    const currentIndex = sequenceIndices[i];

    if (previousIndex >= currentIndex) {
      throw new Error(
        `Sequence mismatch for validateSequence entries. Expected order: ${JSON.stringify(
          sequenceEntries.map((entry) => entry.text)
        )}`
      );
    }
  }
}
