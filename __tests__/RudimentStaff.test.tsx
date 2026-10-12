import { act, create } from 'react-test-renderer';
import { RUDIMENTS } from '@/core/rudiments/catalog';
import RudimentStaff from '@/core/render/native/RudimentStaff';

describe('RudimentStaff', () => {
  it.each(RUDIMENTS.map((rudiment) => [rudiment.id, rudiment] as const))(
    'renders rudiment %i with a highlighted beat',
    async (_, rudiment) => {
      let renderer: ReturnType<typeof create> | undefined;
      await act(async () => {
        renderer = create(<RudimentStaff rudiment={rudiment} width={360} activeBeat={1} />);
      });
      expect(renderer?.toJSON()).toBeTruthy();
    },
  );
});
